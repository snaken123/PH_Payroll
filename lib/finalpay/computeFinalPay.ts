import { Decimal } from "decimal.js";
import { computeSeparationPay, type SeparationPayCategory } from "./computeSeparationPay";
import { computeRetirementPay } from "./computeRetirementPay";
import { computeLeaveCashout } from "./computeLeaveCashout";
import { computeThirteenthMonthPay } from "../payroll/thirteenthMonth";
import { computeAnnualization } from "../payroll/annualization";
import { SEPARATION_PAY_CATEGORIES, type FinalPayInput, type FinalPayLineItemDraft, type FinalPayResult } from "./types";

/**
 * Pure orchestrator, no Prisma — mirrors lib/payroll/engine.ts's discipline.
 *
 * KNOWN SIMPLIFICATION: leave cashout is treated as fully taxable. PH tax
 * practice recognizes a de minimis exemption for monetized unused vacation
 * leave up to a ceiling (RR 29-2025), but that ceiling isn't seeded in
 * DeMinimisCeiling for the MONETIZED_UNUSED_LEAVE category in this system
 * yet, so treating the full cashout as taxable is the conservative (safer
 * to over-withhold than under-withhold) default rather than guessing a
 * figure. Flagged the same way the 2316 report's own simplifications are.
 *
 * KNOWN SIMPLIFICATION: DEATH and discretionary financial-assistance
 * amounts (e.g. a company voluntarily paying something on a for-cause
 * termination) are NOT computed by formula — there isn't one. Those
 * categories produce zero from this function; a preparer adds a manual
 * OTHER line item at the API/UI layer if the company chooses to grant
 * something (see plan notes — not built as an editable-draft UI in this
 * pass, informational only).
 */
export function computeFinalPay(input: FinalPayInput): FinalPayResult {
  const lineItems: FinalPayLineItemDraft[] = [];
  const zero = new Decimal(0);

  // 1. Unpaid wages for the final (partial) cutoff
  const unpaidWages = new Decimal(input.unpaidWagesAmount);
  if (unpaidWages.greaterThan(0)) {
    lineItems.push({
      category: "UNPAID_WAGES",
      direction: "EARNING",
      description: "Unpaid wages (final cutoff)",
      amount: unpaidWages,
      isTaxExempt: false,
    });
  }

  // 2. Prorated 13th month — split into exempt/taxable portions since the
  // ceiling is a combined-benefits threshold, not an all-or-nothing cutoff.
  const thirteenthMonth = computeThirteenthMonthPay(
    input.basicSalaryEarnedThisYear,
    input.thirteenthMonthExemptionCeiling
  );
  const thirteenthMonthExempt = thirteenthMonth.thirteenthMonthPay.minus(thirteenthMonth.taxableExcess);
  if (thirteenthMonthExempt.greaterThan(0)) {
    lineItems.push({
      category: "PRORATED_THIRTEENTH_MONTH",
      direction: "EARNING",
      description: "Prorated 13th month pay (tax-exempt portion)",
      amount: thirteenthMonthExempt,
      isTaxExempt: true,
    });
  }
  if (thirteenthMonth.taxableExcess.greaterThan(0)) {
    lineItems.push({
      category: "PRORATED_THIRTEENTH_MONTH",
      direction: "EARNING",
      description: "Prorated 13th month pay (taxable excess over exemption ceiling)",
      amount: thirteenthMonth.taxableExcess,
      isTaxExempt: false,
    });
  }

  // 3. Leave cashout (see simplification note above)
  const leaveCashout = computeLeaveCashout(input.unusedConvertibleLeaveDays, input.dailyRateEquivalent);
  if (leaveCashout.greaterThan(0)) {
    lineItems.push({
      category: "LEAVE_CASHOUT",
      direction: "EARNING",
      description: "Cash conversion of unused convertible leave",
      amount: leaveCashout,
      isTaxExempt: false,
    });
  }

  // 4. Separation / retirement pay — category-gated. RESIGNATION,
  // TERMINATION_FOR_CAUSE, END_OF_CONTRACT, and DEATH produce no
  // formula-driven amount (no statutory entitlement / no formula exists).
  if (SEPARATION_PAY_CATEGORIES.includes(input.separationCategory as SeparationPayCategory)) {
    const separationPay = computeSeparationPay(
      input.monthlyEquivalentRate,
      input.yearsOfServiceCredited,
      input.separationCategory as SeparationPayCategory
    );
    lineItems.push({
      category: "SEPARATION_PAY",
      direction: "EARNING",
      description: "Separation pay",
      amount: separationPay.amount,
      isTaxExempt: separationPay.isTaxExempt,
    });
  } else if (input.separationCategory === "RETIREMENT") {
    const retirementPay = computeRetirementPay(input.dailyRateEquivalent, input.yearsOfServiceCredited);
    lineItems.push({
      category: "RETIREMENT_PAY",
      direction: "EARNING",
      description: "Retirement pay (RA 7641)",
      amount: retirementPay.amount,
      isTaxExempt: retirementPay.isTaxExempt,
    });
  }

  // 5. Loan payoff — full remaining balance, not one installment.
  const loanPayoff = new Decimal(input.outstandingLoanBalance);
  if (loanPayoff.greaterThan(0)) {
    lineItems.push({
      category: "LOAN_PAYOFF",
      direction: "DEDUCTION",
      description: "Outstanding loan balance (paid off in full)",
      amount: loanPayoff,
      isTaxExempt: false,
    });
  }

  // 6. Year-end annualization true-up. Only the TAXABLE components of this
  // final pay run count toward taxable income for the year — exempt
  // separation/retirement pay and the exempt 13th-month portion don't.
  const taxableFinalPayComponents = lineItems
    .filter((li) => li.direction === "EARNING" && !li.isTaxExempt)
    .reduce((sum, li) => sum.plus(li.amount), zero);

  const totalTaxableForYear = new Decimal(input.priorTaxableCompensationForYear).plus(
    taxableFinalPayComponents
  );
  const annualization = computeAnnualization(
    totalTaxableForYear,
    input.cumulativeTaxWithheldForYear,
    input.annualBrackets
  );

  if (annualization.yearEndAdjustment.greaterThan(0)) {
    lineItems.push({
      category: "WITHHOLDING_TAX_ADJUSTMENT",
      direction: "DEDUCTION",
      description: "Withholding tax adjustment (year-end true-up)",
      amount: annualization.yearEndAdjustment,
      isTaxExempt: false,
    });
  } else if (annualization.yearEndAdjustment.lessThan(0)) {
    lineItems.push({
      category: "WITHHOLDING_TAX_ADJUSTMENT",
      direction: "EARNING",
      description: "Tax refund (year-end true-up)",
      amount: annualization.yearEndAdjustment.abs(),
      isTaxExempt: true,
    });
  }

  const grossFinalPay = lineItems
    .filter((li) => li.direction === "EARNING")
    .reduce((sum, li) => sum.plus(li.amount), zero);
  const totalDeductions = lineItems
    .filter((li) => li.direction === "DEDUCTION")
    .reduce((sum, li) => sum.plus(li.amount), zero);

  // NOT floored at 0 — see plan design note: a departing employee's loan
  // balance can legitimately exceed what's owed to them.
  const netFinalPay = grossFinalPay.minus(totalDeductions);

  return { lineItems, grossFinalPay, totalDeductions, netFinalPay };
}
