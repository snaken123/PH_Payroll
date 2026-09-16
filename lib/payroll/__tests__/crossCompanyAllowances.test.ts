import { describe, it, expect } from "vitest";
import { estimateMonthlyEquivalentCompensation } from "../estimateMonthlyEquivalent";

describe("estimateMonthlyEquivalentCompensation — Cross-Company Allowance Rules", () => {
  const currentCompanyId = "company-123";
  const otherCompanyId = "company-456";

  const basicRate = 30000; // Monthly basic pay

  const currentCompanyAllowance = {
    amount: 5000,
    frequency: "MONTHLY" as const,
    isTaxable: true,
    payingCompanyId: currentCompanyId,
  };

  const unspecifiedPayingCompanyAllowance = {
    amount: 3000,
    frequency: "MONTHLY" as const,
    isTaxable: true,
    payingCompanyId: null,
  };

  const otherCompanyAllowance = {
    amount: 10000,
    frequency: "MONTHLY" as const,
    isTaxable: true,
    payingCompanyId: otherCompanyId,
  };

  it("excludes allowances paid by a different company by default (unselected)", () => {
    const result = estimateMonthlyEquivalentCompensation({
      payBasis: "MONTHLY_RATE",
      basicRate,
      standardWorkDaysPerMonth: 26,
      allowances: [
        currentCompanyAllowance,
        unspecifiedPayingCompanyAllowance,
        otherCompanyAllowance,
      ],
      currentCompanyId,
      includeOtherCompanyAllowancesInContributions: false, // Default: unselected
    });

    // 30,000 (basic) + 5,000 (current company) + 3,000 (unspecified company) = 38,000
    // 10,000 (other company) is EXCLUDED.
    expect(result.toNumber()).toBe(38000);
  });

  it("includes allowances paid by a different company when setting toggle is selected (true)", () => {
    const result = estimateMonthlyEquivalentCompensation({
      payBasis: "MONTHLY_RATE",
      basicRate,
      standardWorkDaysPerMonth: 26,
      allowances: [
        currentCompanyAllowance,
        unspecifiedPayingCompanyAllowance,
        otherCompanyAllowance,
      ],
      currentCompanyId,
      includeOtherCompanyAllowancesInContributions: true, // Selected
    });

    // 30,000 (basic) + 5,000 (current company) + 3,000 (unspecified) + 10,000 (other company) = 48,000
    expect(result.toNumber()).toBe(48000);
  });

  it("converts daily allowances to monthly equivalent before applying cross-company filtering rules", () => {
    const dailyOtherCompanyAllowance = {
      amount: 200, // 200/day * 26 days = 5200/month
      frequency: "DAILY" as const,
      isTaxable: true,
      payingCompanyId: otherCompanyId,
    };

    // Default (unselected = false): exclude daily other company allowance
    const resultExcluded = estimateMonthlyEquivalentCompensation({
      payBasis: "MONTHLY_RATE",
      basicRate: 20000,
      standardWorkDaysPerMonth: 26,
      allowances: [dailyOtherCompanyAllowance],
      currentCompanyId,
      includeOtherCompanyAllowancesInContributions: false,
    });
    expect(resultExcluded.toNumber()).toBe(20000);

    // Selected (true): include daily other company allowance (200 * 26 = 5200)
    const resultIncluded = estimateMonthlyEquivalentCompensation({
      payBasis: "MONTHLY_RATE",
      basicRate: 20000,
      standardWorkDaysPerMonth: 26,
      allowances: [dailyOtherCompanyAllowance],
      currentCompanyId,
      includeOtherCompanyAllowancesInContributions: true,
    });
    expect(resultIncluded.toNumber()).toBe(25200);
  });
});
