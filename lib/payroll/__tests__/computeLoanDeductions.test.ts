import { describe, expect, it } from "vitest";
import { computeLoanDeductions } from "../deductions/computeLoanDeductions";
import type { ActiveLoanInput } from "../deductions/computeLoanDeductions";

describe("computeLoanDeductions", () => {
  it("deducts the full installment when funds and balance allow", () => {
    const loans: ActiveLoanInput[] = [
      { id: "l1", description: "SSS Loan", installmentAmount: 1000, remainingBalance: 5000, deductionFrequency: "EVERY_CUTOFF" },
    ];
    const result = computeLoanDeductions(loans, 10000, true);
    expect(result).toHaveLength(1);
    expect(result[0].amountDeducted.toNumber()).toBe(1000);
    expect(result[0].balanceAfter.toNumber()).toBe(4000);
  });

  it("caps the final installment at the remaining balance (no overpayment)", () => {
    const loans: ActiveLoanInput[] = [
      { id: "l1", description: "Cash advance", installmentAmount: 1000, remainingBalance: 300, deductionFrequency: "EVERY_CUTOFF" },
    ];
    const result = computeLoanDeductions(loans, 10000, true);
    expect(result[0].amountDeducted.toNumber()).toBe(300);
    expect(result[0].balanceAfter.toNumber()).toBe(0);
  });

  it("never exceeds the available funds ceiling across multiple loans", () => {
    const loans: ActiveLoanInput[] = [
      { id: "l1", description: "Loan A", installmentAmount: 1000, remainingBalance: 5000, deductionFrequency: "EVERY_CUTOFF" },
      { id: "l2", description: "Loan B", installmentAmount: 1000, remainingBalance: 5000, deductionFrequency: "EVERY_CUTOFF" },
    ];
    const result = computeLoanDeductions(loans, 1500, true);
    expect(result).toHaveLength(2);
    expect(result[0].amountDeducted.toNumber()).toBe(1000);
    expect(result[1].amountDeducted.toNumber()).toBe(500); // only 500 left of the ceiling
  });

  it("skips a loan entirely once available funds are exhausted", () => {
    const loans: ActiveLoanInput[] = [
      { id: "l1", description: "Loan A", installmentAmount: 1000, remainingBalance: 5000, deductionFrequency: "EVERY_CUTOFF" },
      { id: "l2", description: "Loan B", installmentAmount: 1000, remainingBalance: 5000, deductionFrequency: "EVERY_CUTOFF" },
    ];
    const result = computeLoanDeductions(loans, 1000, true);
    expect(result).toHaveLength(1);
    expect(result[0].loanId).toBe("l1");
  });

  it("skips loans that are already fully paid off", () => {
    const loans: ActiveLoanInput[] = [
      { id: "l1", description: "Paid off", installmentAmount: 1000, remainingBalance: 0, deductionFrequency: "EVERY_CUTOFF" },
    ];
    const result = computeLoanDeductions(loans, 10000, true);
    expect(result).toHaveLength(0);
  });

  it("returns nothing when there are no available funds", () => {
    const loans: ActiveLoanInput[] = [
      { id: "l1", description: "Loan A", installmentAmount: 1000, remainingBalance: 5000, deductionFrequency: "EVERY_CUTOFF" },
    ];
    expect(computeLoanDeductions(loans, 0, true)).toHaveLength(0);
  });

  it("deducts an EVERY_CUTOFF loan regardless of the monthly-cutoff flag", () => {
    const loans: ActiveLoanInput[] = [
      { id: "l1", description: "Loan A", installmentAmount: 1000, remainingBalance: 5000, deductionFrequency: "EVERY_CUTOFF" },
    ];
    expect(computeLoanDeductions(loans, 10000, false)).toHaveLength(1);
    expect(computeLoanDeductions(loans, 10000, true)).toHaveLength(1);
  });

  it("skips a MONTHLY loan on a non-monthly cutoff", () => {
    const loans: ActiveLoanInput[] = [
      { id: "l1", description: "Cash advance", installmentAmount: 1000, remainingBalance: 5000, deductionFrequency: "MONTHLY" },
    ];
    expect(computeLoanDeductions(loans, 10000, false)).toHaveLength(0);
  });

  it("deducts a MONTHLY loan on the monthly cutoff", () => {
    const loans: ActiveLoanInput[] = [
      { id: "l1", description: "Cash advance", installmentAmount: 1000, remainingBalance: 5000, deductionFrequency: "MONTHLY" },
    ];
    const result = computeLoanDeductions(loans, 10000, true);
    expect(result).toHaveLength(1);
    expect(result[0].amountDeducted.toNumber()).toBe(1000);
  });

  it("mixes MONTHLY and EVERY_CUTOFF loans correctly on a non-monthly cutoff", () => {
    const loans: ActiveLoanInput[] = [
      { id: "l1", description: "Company loan", installmentAmount: 500, remainingBalance: 5000, deductionFrequency: "EVERY_CUTOFF" },
      { id: "l2", description: "Cash advance", installmentAmount: 1000, remainingBalance: 5000, deductionFrequency: "MONTHLY" },
    ];
    const result = computeLoanDeductions(loans, 10000, false);
    expect(result).toHaveLength(1);
    expect(result[0].loanId).toBe("l1");
  });
});
