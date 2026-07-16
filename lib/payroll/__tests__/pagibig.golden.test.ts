import { describe, expect, it } from "vitest";
import { getPagibigContribution } from "../rates/getPagibigContribution";
import type { PagibigBracketRow } from "../types";

// Mirrors prisma/seed.ts's PagibigContributionBracket (HDMF Circular 460):
// 1%/2% at or below ₱1,500, 2%/2% above; Max Fund Salary ₱10,000, capped
// at ₱200 EE / ₱200 ER.
const bracket: PagibigBracketRow = {
  salaryThreshold: 1500,
  eeRateBelowThreshold: 0.01,
  erRateBelowThreshold: 0.02,
  eeRateAboveThreshold: 0.02,
  erRateAboveThreshold: 0.02,
  maxFundSalary: 10000,
  eeCap: 200,
  erCap: 200,
};

describe("getPagibigContribution", () => {
  it("applies the 1% employee rate at or below the ₱1,500 threshold", () => {
    const result = getPagibigContribution(1500, bracket);
    expect(result.eeShare.toNumber()).toBe(15);
    expect(result.erShare.toNumber()).toBe(30);
  });

  it("applies the 2% employee rate just above the ₱1,500 threshold", () => {
    const result = getPagibigContribution(1501, bracket);
    expect(result.eeShare.toNumber()).toBe(30.02);
    expect(result.erShare.toNumber()).toBe(30.02);
  });

  it("caps contributions at the Maximum Fund Salary", () => {
    const result = getPagibigContribution(50000, bracket);
    expect(result.contributionBase.toNumber()).toBe(10000);
    expect(result.eeShare.toNumber()).toBe(200);
    expect(result.erShare.toNumber()).toBe(200);
  });

  it("matches the documented max monthly contribution (₱200 + ₱200)", () => {
    const result = getPagibigContribution(10000, bracket);
    expect(result.totalContribution.toNumber()).toBe(400);
  });
});
