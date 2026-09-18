import { Decimal } from "decimal.js";

export type LoanDeductionFrequency = "EVERY_CUTOFF" | "MONTHLY";

export interface ActiveLoanInput {
  id: string;
  description: string;
  installmentAmount: Decimal.Value;
  remainingBalance: Decimal.Value;
  deductionFrequency: LoanDeductionFrequency;
  hasNoExpiration?: boolean;
  endDate?: Date | string | null;
}

export interface LoanDeductionResult {
  loanId: string;
  description: string;
  amountDeducted: Decimal;
  balanceAfter: Decimal;
  hasNoExpiration?: boolean;
  endDate?: Date | string | null;
}

/**
 * Deducts each active loan's installment in order, never exceeding that
 * loan's own remaining balance (unless hasNoExpiration is true or endDate is active)
 * and never exceeding `availableForDeductions` in total.
 */
export function computeLoanDeductions(
  loans: ActiveLoanInput[],
  availableForDeductions: Decimal.Value,
  isMonthlyDeductionCutoff: boolean,
  cutoffDate?: Date | string | null
): LoanDeductionResult[] {
  let remaining = new Decimal(availableForDeductions);
  const results: LoanDeductionResult[] = [];

  for (const loan of loans) {
    if (remaining.lte(0)) break;
    if (loan.deductionFrequency === "MONTHLY" && !isMonthlyDeductionCutoff) continue;

    const balance = new Decimal(loan.remainingBalance);
    const hasNoExpiration = !!loan.hasNoExpiration;
    const hasEndDate = !!loan.endDate;

    if (hasEndDate && cutoffDate) {
      const cutoff = new Date(cutoffDate);
      const end = new Date(loan.endDate!);
      if (cutoff > end) continue;
    }

    const isOngoingOrEndDate = hasNoExpiration || hasEndDate;

    if (!isOngoingOrEndDate && balance.lte(0)) continue;

    const installment = isOngoingOrEndDate
      ? new Decimal(loan.installmentAmount)
      : Decimal.min(loan.installmentAmount, balance);

    const deduction = Decimal.min(installment, remaining);
    if (deduction.lte(0)) continue;

    const balanceAfter = isOngoingOrEndDate ? new Decimal(0) : balance.minus(deduction);

    results.push({
      loanId: loan.id,
      description: loan.description,
      amountDeducted: deduction,
      balanceAfter,
      hasNoExpiration,
      endDate: loan.endDate,
    });
    remaining = remaining.minus(deduction);
  }

  return results;
}
