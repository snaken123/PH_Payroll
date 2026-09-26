import { Decimal } from "decimal.js";
import { computeBasePay } from "./attendance/computeBasePay";
import { computeOvertimeNightDiff } from "./attendance/computeOvertimeNightDiff";
import { computeHolidayPremium } from "./attendance/computeHolidayPremium";
import { getSssContribution } from "./rates/getSssContribution";
import { getPhilhealthContribution } from "./rates/getPhilhealthContribution";
import { getPagibigContribution } from "./rates/getPagibigContribution";
import { getWithholdingTax } from "./rates/getWithholdingTax";
import { computeLoanDeductions, type ActiveLoanInput } from "./deductions/computeLoanDeductions";
import type { TimesheetFact } from "./attendance/types";
import type {
  BirBracketRow,
  PagibigBracketRow,
  PayBasis,
  PhilhealthConfigRow,
  SssBracketRow,
} from "./types";

export interface AllowanceInput {
  label: string;
  amount: Decimal.Value;
  frequency?: "DAILY" | "MONTHLY" | null;
  isTaxable: boolean;
  isDeMinimis?: boolean;
  deMinimisCategory?: string | null;
  deMinimisCeilingAmount?: Decimal.Value | null;
  deMinimisFrequency?: "MONTHLY" | "ANNUAL" | null;
  payingCompanyId?: string | null;
}

export type LineItemCategory =
  | "BASIC_PAY"
  | "OVERTIME"
  | "NIGHT_DIFF"
  | "HOLIDAY_PREMIUM"
  | "REST_DAY_PREMIUM"
  | "ALLOWANCE"
  | "SSS_EE"
  | "SSS_ER"
  | "PHILHEALTH_EE"
  | "PHILHEALTH_ER"
  | "PAGIBIG_EE"
  | "PAGIBIG_ER"
  | "WITHHOLDING_TAX"
  | "LATE_UNDERTIME_DEDUCTION"
  | "LOAN_DEDUCTION";

export interface LineItemDraft {
  category: LineItemCategory;
  direction: "EARNING" | "DEDUCTION" | "EMPLOYER_CONTRIBUTION";
  description: string;
  amount: Decimal;
  quantity?: Decimal;
  /** Present only for LOAN_DEDUCTION line items — which Loan this deducted. */
  loanId?: string;
  /** Audit / tax metadata for the line item. */
  sourceRef?: Record<string, unknown>;
}

export interface PayrollEngineInput {
  payBasis: PayBasis;
  basicRate: Decimal.Value;
  standardWorkDaysPerMonth?: Decimal.Value;
  isManagerialExempt: boolean;
  timesheets: TimesheetFact[];
  allowances: AllowanceInput[];
  currentCompanyId?: string | null;
  /** Whether this cutoff is semi-monthly (15-day / twice per month). Defaults to true. */
  isSemiMonthly?: boolean;
  /** Cutoff period type ("FIRST_HALF", "SECOND_HALF", "MONTHLY"). */
  cutoffType?: "FIRST_HALF" | "SECOND_HALF" | "MONTHLY";
  /** Basic pay pay-period frequency setting ("TWICE_A_MONTH", "ONCE_A_MONTH_SECOND_HALF", "ONCE_A_MONTH_FIRST_HALF"). */
  basicPayFrequency?: "TWICE_A_MONTH" | "ONCE_A_MONTH_SECOND_HALF" | "ONCE_A_MONTH_FIRST_HALF";
  /** Allowance pay-period frequency setting ("TWICE_A_MONTH", "ONCE_A_MONTH_SECOND_HALF", "ONCE_A_MONTH_FIRST_HALF"). */
  allowancePayFrequency?: "TWICE_A_MONTH" | "ONCE_A_MONTH_SECOND_HALF" | "ONCE_A_MONTH_FIRST_HALF";
  /** Optional scale factor for statutory deductions (e.g. 0.5 when company timing is set to SPLIT across cutoffs). Defaults to 1. */
  statutoryDeductionScale?: Decimal.Value;
  /**
   * Whether this cutoff carries the monthly SSS/PhilHealth/Pag-IBIG
   * deduction. Common PH SME convention (not a universal legal requirement):
   * the full monthly statutory contribution is deducted once, on the
   * second-half cutoff, since those contributions are inherently monthly
   * concepts even though this product pays semi-monthly.
   */
  isStatutoryDeductionCutoff: boolean;
  /**
   * Monthly-equivalent gross compensation used as the SSS/PhilHealth/Pag-IBIG
   * contribution base — independent of this cutoff's actual gross pay.
   */
  monthlyEquivalentCompensation: Decimal.Value;
  /** Per-employee statutory deduction opt-in/opt-out flags. Default to true. */
  isDeductSss?: boolean;
  sssDeductionMode?: "TABLE" | "MANUAL";
  sssCustomAmountEe?: Decimal.Value | null;
  sssCustomAmountEr?: Decimal.Value | null;

  isDeductPhilhealth?: boolean;
  philhealthDeductionMode?: "TABLE" | "MANUAL";
  philhealthCustomAmountEe?: Decimal.Value | null;
  philhealthCustomAmountEr?: Decimal.Value | null;

  isDeductPagibig?: boolean;
  pagibigDeductionMode?: "TABLE" | "MANUAL";
  pagibigCustomAmountEe?: Decimal.Value | null;
  pagibigCustomAmountEr?: Decimal.Value | null;

  isDeductWithholdingTax?: boolean;

  rates: {
    sssBrackets: SssBracketRow[];
    philhealthConfig: PhilhealthConfigRow;
    pagibigBracket: PagibigBracketRow;
    birBrackets: BirBracketRow[];
  };
  /** Active loans/cash advances to deduct this cutoff, in deduction order. */
  activeLoans?: ActiveLoanInput[];
  /** Cutoff end date for checking loan end dates. */
  cutoffDate?: Date | string | null;
}

export interface PayrollEngineResult {
  lineItems: LineItemDraft[];
  grossPay: Decimal;
  totalStatutoryDeductions: Decimal;
  totalOtherDeductions: Decimal;
  netPay: Decimal;
  /** Loan deduction outcomes, for the caller to persist LoanDeduction rows
   * and update each Loan's remainingBalance. */
  loanDeductions: ReturnType<typeof computeLoanDeductions>;
}

/**
 * Pure orchestrator: base pay -> attendance adjustments -> gross -> statutory
 * deductions -> (loans/other deductions, starting Phase 3) -> net. No Prisma
 * calls — the caller resolves employee/timesheet/rate data first and passes
 * plain data in, which is what makes this golden-value testable without a
 * database.
 */
export function computePayroll(input: PayrollEngineInput): PayrollEngineResult {
  const lineItems: LineItemDraft[] = [];
  const zero = new Decimal(0);

  // 1. Base pay
  const base = computeBasePay({
    payBasis: input.payBasis,
    basicRate: input.basicRate,
    standardWorkDaysPerMonth: input.standardWorkDaysPerMonth,
    timesheets: input.timesheets,
    isSemiMonthly: input.isSemiMonthly ?? false,
    cutoffType: input.cutoffType,
    basicPayFrequency: input.basicPayFrequency,
  });
  lineItems.push({
    category: "BASIC_PAY",
    direction: "EARNING",
    description: "Basic pay",
    amount: base.grossBasicPay,
  });

  // 2. Attendance-based adjustments (OT/night-diff gated by managerial
  // exemption inside each function; unworked-holiday base pay is already
  // inside base.basePay for daily-rate employees).
  const otNd = computeOvertimeNightDiff(
    input.timesheets,
    base.hourlyRateEquivalent,
    input.isManagerialExempt
  );
  if (otNd.overtimePay.greaterThan(0)) {
    lineItems.push({
      category: "OVERTIME",
      direction: "EARNING",
      description: "Overtime pay",
      amount: otNd.overtimePay,
      quantity: otNd.overtimeHours,
    });
  }
  if (otNd.nightDiffPay.greaterThan(0)) {
    lineItems.push({
      category: "NIGHT_DIFF",
      direction: "EARNING",
      description: "Night shift differential",
      amount: otNd.nightDiffPay,
      quantity: otNd.nightDiffHours,
    });
  }

  const holiday = computeHolidayPremium(
    input.timesheets,
    base.dailyRateEquivalent,
    input.isManagerialExempt
  );
  if (holiday.regularHolidayWorkedPremium.greaterThan(0)) {
    lineItems.push({
      category: "HOLIDAY_PREMIUM",
      direction: "EARNING",
      description: "Regular holiday premium",
      amount: holiday.regularHolidayWorkedPremium,
    });
  }
  if (holiday.specialNonWorkingWorkedPremium.greaterThan(0)) {
    lineItems.push({
      category: "HOLIDAY_PREMIUM",
      direction: "EARNING",
      description: "Special non-working day premium",
      amount: holiday.specialNonWorkingWorkedPremium,
    });
  }
  if (holiday.restDayWorkedPremium.greaterThan(0)) {
    lineItems.push({
      category: "REST_DAY_PREMIUM",
      direction: "EARNING",
      description: "Rest day premium",
      amount: holiday.restDayWorkedPremium,
    });
  }

  if (base.absenceDeduction.greaterThan(0)) {
    lineItems.push({
      category: "LATE_UNDERTIME_DEDUCTION",
      direction: "DEDUCTION",
      description: "Absence deduction",
      amount: base.absenceDeduction,
    });
  }
  if (base.lateUndertimeDeduction.greaterThan(0)) {
    lineItems.push({
      category: "LATE_UNDERTIME_DEDUCTION",
      direction: "DEDUCTION",
      description: "Late/undertime deduction",
      amount: base.lateUndertimeDeduction,
    });
  }

  // 3. Allowances (recurring, from CompensationRecord)
  let nonTaxableAllowances = zero;

  for (const allowance of input.allowances) {
    let amount = new Decimal(allowance.amount);

    if (allowance.frequency === "DAILY") {
      if (input.timesheets.length > 0) {
        let workedDays = new Decimal(0);
        for (const t of input.timesheets) {
          const totalHours = new Decimal(t.regularHours || 0).plus(t.overtimeHours || 0);
          if (t.status === "PRESENT" || t.status === "LATE_UNDERTIME" || t.status === "WFH") {
            workedDays = workedDays.plus(1);
          } else if (t.status === "HALF_DAY") {
            workedDays = workedDays.plus(0.5);
          } else if (
            (t.status === "LEAVE" || t.status === "SICK_LEAVE" || t.status === "VACATION_LEAVE") &&
            new Decimal(t.regularHours || 0).greaterThan(0)
          ) {
            workedDays = workedDays.plus(1);
          } else if (totalHours.greaterThan(0)) {
            // Worked on a rest day, holiday, or non-working day
            workedDays = workedDays.plus(1);
          }
        }
        amount = amount.times(workedDays);
      } else {
        const defaultCutoffDays = new Decimal(input.standardWorkDaysPerMonth || 22).div(input.isSemiMonthly ? 2 : 1);
        amount = amount.times(defaultCutoffDays);
      }
    } else {
      // MONTHLY allowance (or unspecified frequency)
      if (input.allowancePayFrequency === "ONCE_A_MONTH_SECOND_HALF") {
        amount = input.cutoffType === "FIRST_HALF" ? zero : amount;
      } else if (input.allowancePayFrequency === "ONCE_A_MONTH_FIRST_HALF") {
        amount = input.cutoffType === "SECOND_HALF" ? zero : amount;
      } else {
        // TWICE_A_MONTH (Default): divide equally per pay period if semi-monthly
        if (input.isSemiMonthly) {
          amount = amount.div(2);
        }
      }
    }

    if (amount.isZero() && (input.allowancePayFrequency === "ONCE_A_MONTH_SECOND_HALF" || input.allowancePayFrequency === "ONCE_A_MONTH_FIRST_HALF")) {
      continue;
    }

    let nonTaxableAmount = zero;

    const isOtherCompany = !!(
      allowance.payingCompanyId &&
      input.currentCompanyId &&
      allowance.payingCompanyId !== input.currentCompanyId
    );

    if (isOtherCompany || !allowance.isTaxable) {
      if (!isOtherCompany && allowance.isDeMinimis && allowance.deMinimisCeilingAmount) {
        const ceiling = new Decimal(allowance.deMinimisCeilingAmount);
        let cutoffCeiling = ceiling;
        if (allowance.deMinimisFrequency === "ANNUAL") {
          cutoffCeiling = ceiling.div(24);
        } else if (allowance.deMinimisFrequency === "MONTHLY") {
          cutoffCeiling = ceiling.div(2);
        }
        nonTaxableAmount = Decimal.min(amount, cutoffCeiling);
      } else {
        nonTaxableAmount = amount;
      }
    }

    nonTaxableAllowances = nonTaxableAllowances.plus(nonTaxableAmount);

    lineItems.push({
      category: "ALLOWANCE",
      direction: "EARNING",
      description: allowance.label,
      amount,
      sourceRef: {
        isTaxable: allowance.isTaxable,
        isDeMinimis: !!allowance.isDeMinimis,
        nonTaxableAmount: nonTaxableAmount.toString(),
        payingCompanyId: allowance.payingCompanyId ?? null,
      },
    });
  }

  const grossEarnings = lineItems
    .filter((li) => li.direction === "EARNING")
    .reduce((sum, li) => sum.plus(li.amount), zero);
  const attendanceDeductions = lineItems
    .filter((li) => li.direction === "DEDUCTION")
    .reduce((sum, li) => sum.plus(li.amount), zero);
  const grossPay = grossEarnings.minus(attendanceDeductions);

  // 4. Statutory deductions
  let statutoryEeTotal = zero;

  if (input.isStatutoryDeductionCutoff) {
    const scale = new Decimal(input.statutoryDeductionScale ?? 1);

    const isDeductSss = input.isDeductSss ?? true;
    const isDeductPhilhealth = input.isDeductPhilhealth ?? true;
    const isDeductPagibig = input.isDeductPagibig ?? true;

    let sssEe = zero;
    let phEe = zero;
    let pagibigEe = zero;

    if (isDeductSss) {
      let unscaledEe = zero;
      let unscaledEr = zero;

      if (input.sssDeductionMode === "MANUAL") {
        unscaledEe = new Decimal(input.sssCustomAmountEe ?? 0);
        unscaledEr = new Decimal(input.sssCustomAmountEr ?? 0);
      } else {
        const sss = getSssContribution(input.monthlyEquivalentCompensation, input.rates.sssBrackets);
        unscaledEe = sss.totalEmployeeContribution;
        unscaledEr = sss.totalEmployerContribution;
      }

      sssEe = unscaledEe.times(scale);
      const sssEr = unscaledEr.times(scale);

      lineItems.push({
        category: "SSS_EE",
        direction: "DEDUCTION",
        description: input.sssDeductionMode === "MANUAL" ? "SSS employee share (manual entry)" : "SSS employee share",
        amount: sssEe,
      });
      lineItems.push({
        category: "SSS_ER",
        direction: "EMPLOYER_CONTRIBUTION",
        description: input.sssDeductionMode === "MANUAL" ? "SSS employer share (manual entry)" : "SSS employer share",
        amount: sssEr,
      });
    }

    if (isDeductPhilhealth) {
      let unscaledEe = zero;
      let unscaledEr = zero;

      if (input.philhealthDeductionMode === "MANUAL") {
        unscaledEe = new Decimal(input.philhealthCustomAmountEe ?? 0);
        unscaledEr = new Decimal(input.philhealthCustomAmountEr ?? 0);
      } else {
        const philhealth = getPhilhealthContribution(
          input.monthlyEquivalentCompensation,
          input.rates.philhealthConfig
        );
        unscaledEe = philhealth.eeShare;
        unscaledEr = philhealth.erShare;
      }

      phEe = unscaledEe.times(scale);
      const phEr = unscaledEr.times(scale);

      lineItems.push({
        category: "PHILHEALTH_EE",
        direction: "DEDUCTION",
        description: input.philhealthDeductionMode === "MANUAL" ? "PhilHealth employee share (manual entry)" : "PhilHealth employee share",
        amount: phEe,
      });
      lineItems.push({
        category: "PHILHEALTH_ER",
        direction: "EMPLOYER_CONTRIBUTION",
        description: input.philhealthDeductionMode === "MANUAL" ? "PhilHealth employer share (manual entry)" : "PhilHealth employer share",
        amount: phEr,
      });
    }

    if (isDeductPagibig) {
      let unscaledEe = zero;
      let unscaledEr = zero;

      if (input.pagibigDeductionMode === "MANUAL") {
        unscaledEe = new Decimal(input.pagibigCustomAmountEe ?? 0);
        unscaledEr = new Decimal(input.pagibigCustomAmountEr ?? 0);
      } else {
        const pagibig = getPagibigContribution(
          input.monthlyEquivalentCompensation,
          input.rates.pagibigBracket
        );
        unscaledEe = pagibig.eeShare;
        unscaledEr = pagibig.erShare;
      }

      pagibigEe = unscaledEe.times(scale);
      const pagibigEr = unscaledEr.times(scale);

      lineItems.push({
        category: "PAGIBIG_EE",
        direction: "DEDUCTION",
        description: input.pagibigDeductionMode === "MANUAL" ? "Pag-IBIG employee share (manual entry)" : "Pag-IBIG employee share",
        amount: pagibigEe,
      });
      lineItems.push({
        category: "PAGIBIG_ER",
        direction: "EMPLOYER_CONTRIBUTION",
        description: input.pagibigDeductionMode === "MANUAL" ? "Pag-IBIG employer share (manual entry)" : "Pag-IBIG employer share",
        amount: pagibigEr,
      });
    }

    statutoryEeTotal = sssEe.plus(phEe).plus(pagibigEe);
  }

  // Withholding tax runs every cutoff on THIS cutoff's actual taxable gross:
  // gross pay minus non-taxable (de minimis capped) allowances minus whatever
  // SSS/PhilHealth/Pag-IBIG EE share was actually deducted this cutoff.
  const isDeductWithholdingTax = input.isDeductWithholdingTax ?? true;
  let withholdingTaxAmount = zero;

  if (isDeductWithholdingTax) {
    const taxableIncome = Decimal.max(
      grossPay.minus(nonTaxableAllowances).minus(statutoryEeTotal),
      0
    );
    const withholding = getWithholdingTax(taxableIncome, "SEMI_MONTHLY", input.rates.birBrackets);
    if (withholding.tax.greaterThan(0)) {
      withholdingTaxAmount = withholding.tax;
      lineItems.push({
        category: "WITHHOLDING_TAX",
        direction: "DEDUCTION",
        description: "Withholding tax",
        amount: withholding.tax,
      });
    }
  }

  const totalStatutoryDeductions = statutoryEeTotal.plus(withholdingTaxAmount);

  // 5. Loans/cash advances — never exceed gross minus statutory deductions,
  // so net pay can't go negative from a loan installment.
  const availableForLoans = grossPay.minus(totalStatutoryDeductions);
  const loanDeductions = computeLoanDeductions(
    input.activeLoans ?? [],
    availableForLoans,
    input.isStatutoryDeductionCutoff,
    input.cutoffDate
  );
  for (const ld of loanDeductions) {
    lineItems.push({
      category: "LOAN_DEDUCTION",
      direction: "DEDUCTION",
      description: ld.description,
      amount: ld.amountDeducted,
      loanId: ld.loanId,
    });
  }
  const totalOtherDeductions = loanDeductions.reduce((sum, ld) => sum.plus(ld.amountDeducted), zero);

  const netPay = grossPay.minus(totalStatutoryDeductions).minus(totalOtherDeductions);

  return { lineItems, grossPay, totalStatutoryDeductions, totalOtherDeductions, netPay, loanDeductions };
}
