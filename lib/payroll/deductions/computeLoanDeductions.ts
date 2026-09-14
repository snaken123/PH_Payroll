import { Decimal } from "decimal.js";

export type LoanDeductionFrequency = "EVERY_CUTOFF" | "MONTHLY";

export interface ActiveLoanInput {
  id: string;
  description: string;
  installmentAmount: Decimal.Value;
  remainingBalance: Decimal.Value;
  deductionFrequency: LoanDeductionFrequency;
  hasNoExpiration?: boolean;
}

export interface LoanDeductionResult {
  loanId: string;
  description: string;
  amountDeducted: Decimal;
  balanceAfter: Decimal;
  hasNoExpiration?: boolean;
}

/**
 * Deducts each active loan's installment in order, never exceeding that
 * loan's own remaining balance (unless hasNoExpiration is true) and never
 * exceeding `availableForDeductions` in total.
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
    const hasNoExpiration = !!loan.hasNoExpiration;

    if (!hasNoExpiration && balance.lte(0)) continue;

    const installment = hasNoExpiration
      ? new Decimal(loan.installmentAmount)
      : Decimal.min(loan.installmentAmount, balance);

    const deduction = Decimal.min(installment, remaining);
    if (deduction.lte(0)) continue;

    const balanceAfter = hasNoExpiration ? new Decimal(0) : balance.minus(deduction);

    results.push({
      loanId: loan.id,
      description: loan.description,
      amountDeducted: deduction,
      balanceAfter,
      hasNoExpiration,
    });
    remaining = remaining.minus(deduction);
  }

  return results;
}
