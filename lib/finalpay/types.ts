import type { Decimal } from "decimal.js";
import type { BirBracketRow } from "../payroll/types";
import type { SeparationPayCategory } from "./computeSeparationPay";

export type FinalPaySeparationCategory =
  | "RESIGNATION"
  | "TERMINATION_FOR_CAUSE"
  | "AUTHORIZED_CAUSE_REDUNDANCY"
  | "AUTHORIZED_CAUSE_RETRENCHMENT"
  | "AUTHORIZED_CAUSE_DISEASE"
  | "RETIREMENT"
  | "DEATH"
  | "END_OF_CONTRACT";

export const SEPARATION_PAY_CATEGORIES: readonly SeparationPayCategory[] = [
  "AUTHORIZED_CAUSE_REDUNDANCY",
  "AUTHORIZED_CAUSE_RETRENCHMENT",
  "AUTHORIZED_CAUSE_DISEASE",
];

export type FinalPayLineItemCategory =
  | "UNPAID_WAGES"
  | "PRORATED_THIRTEENTH_MONTH"
  | "LEAVE_CASHOUT"
  | "SEPARATION_PAY"
  | "RETIREMENT_PAY"
  | "LOAN_PAYOFF"
  | "WITHHOLDING_TAX_ADJUSTMENT"
  | "OTHER";

export interface FinalPayLineItemDraft {
  category: FinalPayLineItemCategory;
  direction: "EARNING" | "DEDUCTION" | "EMPLOYER_CONTRIBUTION";
  description: string;
  amount: Decimal;
  isTaxExempt: boolean;
}

export interface FinalPayInput {
  separationCategory: FinalPaySeparationCategory;
  /** Effective monthly rate, used for the separation-pay formula. */
  monthlyEquivalentRate: Decimal.Value;
  /** Effective daily rate, used for retirement pay and leave cashout. */
  dailyRateEquivalent: Decimal.Value;
  yearsOfServiceCredited: number;
  /** Wages earned but not yet paid for the final (partial) cutoff. */
  unpaidWagesAmount: Decimal.Value;
  /** Sum of unused days across LeaveType rows where isConvertibleToCash is true. */
  unusedConvertibleLeaveDays: Decimal.Value;
  /** Basic salary earned so far this calendar year, for the prorated 13th month. */
  basicSalaryEarnedThisYear: Decimal.Value;
  thirteenthMonthExemptionCeiling: Decimal.Value;
  /** Sum of remainingBalance across the employee's ACTIVE loans — paid off
   * in full here, not per the usual installment schedule. */
  outstandingLoanBalance: Decimal.Value;
  /** Taxable compensation already earned this year from posted payslips
   * (grossPay minus SSS/PhilHealth/Pag-IBIG EE shares), for the
   * year-end annualization true-up. */
  priorTaxableCompensationForYear: Decimal.Value;
  /** Withholding tax already collected this year from posted payslips. */
  cumulativeTaxWithheldForYear: Decimal.Value;
  annualBrackets: BirBracketRow[];
}

export interface FinalPayResult {
  lineItems: FinalPayLineItemDraft[];
  grossFinalPay: Decimal;
  totalDeductions: Decimal;
  /** NOT floored at 0 — see engine design note in computeFinalPay.ts. */
  netFinalPay: Decimal;
}
