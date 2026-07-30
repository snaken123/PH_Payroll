import { Decimal } from "decimal.js";

export type LoanDeductionFrequency = "EVERY_CUTOFF" | "MONTHLY";

export interface ActiveLoanInput {
  id: string;
  description: string;
  installmentAmount: Decimal.Value;
  remainingBalance: Decimal.Value;
  deductionFrequency: LoanDeductionFrequency;
}

export interface LoanDeductionResult {
  loanId: string;
  description: string;
  amountDeducted: Decimal;
  balanceAfter: Decimal;
}

/**
 * Deducts each active loan's installment in order, never exceeding that
 * loan's own remaining balance (so the final installment is a partial
 * payoff, not an overpayment) and never exceeding `availableForDeductions`
 * in total (gross pay minus statutory deductions) — net pay must never go
 * negative. Loans are processed in the order given; if funds run out,
 * later loans in the list are simply skipped this cutoff rather than
 * partially deducted, so partial deductions only ever happen at a loan's
 * own payoff boundary.
 *
 * `isMonthlyDeductionCutoff` reuses the same "second cutoff of the month"
 * signal the payroll engine already computes for SSS/PhilHealth/Pag-IBIG
 * (isStatutoryDeductionCutoff) — a MONTHLY-frequency loan only deducts on
 * that cutoff; EVERY_CUTOFF loans are unaffected by this flag.
 */
export function computeLoanDeductions(
  loans: ActiveLoanInput[],
  availableForDeductions: Decimal.Value,
  isMonthlyDeductionCutoff: boolean
): LoanDeductionResult[] {
  let remaining = new Decimal(availableForDeductions);
  const results: LoanDeductionResult[] = [];

  for (const loan of loans) {
    if (remaining.lte(0)) break;
    if (loan.deductionFrequency === "MONTHLY" && !isMonthlyDeductionCutoff) continue;

    const balance = new Decimal(loan.remainingBalance);
    if (balance.lte(0)) continue;

    const installment = Decimal.min(loan.installmentAmount, balance);
    const deduction = Decimal.min(installment, remaining);
    if (deduction.lte(0)) continue;

    results.push({
      loanId: loan.id,
      description: loan.description,
      amountDeducted: deduction,
      balanceAfter: balance.minus(deduction),
    });
    remaining = remaining.minus(deduction);
  }

  return results;
}
