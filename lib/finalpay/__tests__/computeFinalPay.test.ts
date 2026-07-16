import { describe, expect, it } from "vitest";
import { computeFinalPay } from "../computeFinalPay";
import type { FinalPayInput } from "../types";
import type { BirBracketRow } from "../../payroll/types";

const annualBrackets: BirBracketRow[] = [
  { payPeriodType: "ANNUAL", bracketFloor: 0, bracketCeiling: 250000, baseTax: 0, excessRate: 0 },
  { payPeriodType: "ANNUAL", bracketFloor: 250000, bracketCeiling: 400000, baseTax: 0, excessRate: 0.15 },
  { payPeriodType: "ANNUAL", bracketFloor: 400000, bracketCeiling: 800000, baseTax: 22500, excessRate: 0.2 },
];

function baseInput(overrides: Partial<FinalPayInput> = {}): FinalPayInput {
  return {
    separationCategory: "RESIGNATION",
    monthlyEquivalentRate: 20000,
    dailyRateEquivalent: 1000,
    yearsOfServiceCredited: 5,
    unpaidWagesAmount: 0,
    unusedConvertibleLeaveDays: 0,
    basicSalaryEarnedThisYear: 0,
    thirteenthMonthExemptionCeiling: 90000,
    outstandingLoanBalance: 0,
    priorTaxableCompensationForYear: 0,
    cumulativeTaxWithheldForYear: 0,
    annualBrackets,
    ...overrides,
  };
}

describe("computeFinalPay — authorized-cause redundancy, full scenario", () => {
  it("matches hand-computed totals across every component", () => {
    const result = computeFinalPay(
      baseInput({
        separationCategory: "AUTHORIZED_CAUSE_REDUNDANCY",
        unpaidWagesAmount: 5000,
        unusedConvertibleLeaveDays: 3,
        basicSalaryEarnedThisYear: 120000,
        outstandingLoanBalance: 2000,
        priorTaxableCompensationForYear: 100000,
      })
    );

    // Separation pay: max(20000, 5*20000*1.0) = 100000, exempt
    const separationLine = result.lineItems.find((li) => li.category === "SEPARATION_PAY");
    expect(separationLine?.amount.toNumber()).toBe(100000);
    expect(separationLine?.isTaxExempt).toBe(true);

    // 13th month: 120000/12 = 10000, fully under the 90,000 ceiling -> fully exempt
    const thirteenthLine = result.lineItems.find((li) => li.description.includes("exempt portion"));
    expect(thirteenthLine?.amount.toNumber()).toBe(10000);

    // Leave cashout: 3 * 1000 = 3000, taxable
    const leaveLine = result.lineItems.find((li) => li.category === "LEAVE_CASHOUT");
    expect(leaveLine?.amount.toNumber()).toBe(3000);
    expect(leaveLine?.isTaxExempt).toBe(false);

    // Taxable for the year (100000 prior + 5000 unpaid wages + 3000 leave = 108000)
    // stays within the 0% annual bracket -> no tax adjustment line item
    expect(result.lineItems.some((li) => li.category === "WITHHOLDING_TAX_ADJUSTMENT")).toBe(false);

    expect(result.grossFinalPay.toNumber()).toBe(5000 + 10000 + 3000 + 100000);
    expect(result.totalDeductions.toNumber()).toBe(2000);
    expect(result.netFinalPay.toNumber()).toBe(5000 + 10000 + 3000 + 100000 - 2000);
  });
});

describe("computeFinalPay — resignation, no separation pay", () => {
  it("computes zero separation pay and does not add a SEPARATION_PAY line item", () => {
    const result = computeFinalPay(
      baseInput({ separationCategory: "RESIGNATION", unpaidWagesAmount: 3000 })
    );
    expect(result.lineItems.some((li) => li.category === "SEPARATION_PAY")).toBe(false);
    expect(result.lineItems.some((li) => li.category === "RETIREMENT_PAY")).toBe(false);
  });
});

describe("computeFinalPay — negative net pay (employee owes the company)", () => {
  it("does not floor net pay at zero when the loan payoff exceeds gross final pay", () => {
    const result = computeFinalPay(
      baseInput({
        separationCategory: "RESIGNATION",
        unpaidWagesAmount: 3000,
        basicSalaryEarnedThisYear: 36000,
        outstandingLoanBalance: 50000,
        priorTaxableCompensationForYear: 40000,
      })
    );

    expect(result.grossFinalPay.toNumber()).toBe(3000 + 3000); // unpaid wages + exempt 13th month (36000/12)
    expect(result.totalDeductions.toNumber()).toBe(50000);
    expect(result.netFinalPay.toNumber()).toBe(-44000);
    expect(result.netFinalPay.lessThan(0)).toBe(true);
  });
});

describe("computeFinalPay — retirement", () => {
  it("computes RA 7641 retirement pay as tax-exempt", () => {
    const result = computeFinalPay(
      baseInput({ separationCategory: "RETIREMENT", yearsOfServiceCredited: 10, dailyRateEquivalent: 800 })
    );
    const retirementLine = result.lineItems.find((li) => li.category === "RETIREMENT_PAY");
    expect(retirementLine?.amount.toNumber()).toBe(180000);
    expect(retirementLine?.isTaxExempt).toBe(true);
  });
});
