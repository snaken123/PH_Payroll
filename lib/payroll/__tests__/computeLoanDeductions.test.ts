import { describe, expect, it } from "vitest";
import { computeLoanDeductions } from "../deductions/computeLoanDeductions";
import type { ActiveLoanInput } from "../deductions/computeLoanDeductions";

describe("computeLoanDeductions", () => {
  it("deducts the full installment when funds and balance allow", () => {
    const loans: ActiveLoanInput[] = [
      { id: "l1", description: "SSS Loan", installmentAmount: 1000, remainingBalance: 5000 },
    ];
    const result = computeLoanDeductions(loans, 10000);
    expect(result).toHaveLength(1);
    expect(result[0].amountDeducted.toNumber()).toBe(1000);
    expect(result[0].balanceAfter.toNumber()).toBe(4000);
  });

  it("caps the final installment at the remaining balance (no overpayment)", () => {
    const loans: ActiveLoanInput[] = [
      { id: "l1", description: "Cash advance", installmentAmount: 1000, remainingBalance: 300 },
    ];
    const result = computeLoanDeductions(loans, 10000);
    expect(result[0].amountDeducted.toNumber()).toBe(300);
    expect(result[0].balanceAfter.toNumber()).toBe(0);
  });

  it("never exceeds the available funds ceiling across multiple loans", () => {
    const loans: ActiveLoanInput[] = [
      { id: "l1", description: "Loan A", installmentAmount: 1000, remainingBalance: 5000 },
      { id: "l2", description: "Loan B", installmentAmount: 1000, remainingBalance: 5000 },
    ];
    const result = computeLoanDeductions(loans, 1500);
    expect(result).toHaveLength(2);
    expect(result[0].amountDeducted.toNumber()).toBe(1000);
    expect(result[1].amountDeducted.toNumber()).toBe(500); // only 500 left of the ceiling
  });

  it("skips a loan entirely once available funds are exhausted", () => {
    const loans: ActiveLoanInput[] = [
      { id: "l1", description: "Loan A", installmentAmount: 1000, remainingBalance: 5000 },
      { id: "l2", description: "Loan B", installmentAmount: 1000, remainingBalance: 5000 },
    ];
    const result = computeLoanDeductions(loans, 1000);
    expect(result).toHaveLength(1);
    expect(result[0].loanId).toBe("l1");
  });

  it("skips loans that are already fully paid off", () => {
    const loans: ActiveLoanInput[] = [
      { id: "l1", description: "Paid off", installmentAmount: 1000, remainingBalance: 0 },
    ];
    const result = computeLoanDeductions(loans, 10000);
    expect(result).toHaveLength(0);
  });

  it("returns nothing when there are no available funds", () => {
    const loans: ActiveLoanInput[] = [
      { id: "l1", description: "Loan A", installmentAmount: 1000, remainingBalance: 5000 },
    ];
    expect(computeLoanDeductions(loans, 0)).toHaveLength(0);
  });
});
