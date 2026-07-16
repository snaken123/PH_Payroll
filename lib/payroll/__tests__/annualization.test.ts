import { describe, expect, it } from "vitest";
import { computeAnnualization } from "../annualization";
import type { BirBracketRow } from "../types";

const annualBrackets: BirBracketRow[] = [
  { payPeriodType: "ANNUAL", bracketFloor: 0, bracketCeiling: 250000, baseTax: 0, excessRate: 0 },
  { payPeriodType: "ANNUAL", bracketFloor: 250000, bracketCeiling: 400000, baseTax: 0, excessRate: 0.15 },
  { payPeriodType: "ANNUAL", bracketFloor: 400000, bracketCeiling: 800000, baseTax: 22500, excessRate: 0.2 },
  { payPeriodType: "ANNUAL", bracketFloor: 800000, bracketCeiling: 2000000, baseTax: 102500, excessRate: 0.25 },
];

describe("computeAnnualization", () => {
  it("is exempt at or below ₱250,000 annual taxable income", () => {
    const result = computeAnnualization(250000, 0, annualBrackets);
    expect(result.annualTaxDue.toNumber()).toBe(0);
  });

  it("matches the well-known TRAIN annual example: ₱500,000 -> ₱42,500", () => {
    const result = computeAnnualization(500000, 0, annualBrackets);
    expect(result.annualTaxDue.toNumber()).toBe(42500);
  });

  it("computes a positive year-end adjustment when under-withheld", () => {
    const result = computeAnnualization(500000, 40000, annualBrackets);
    expect(result.yearEndAdjustment.toNumber()).toBe(2500);
  });

  it("computes a negative year-end adjustment (refund) when over-withheld", () => {
    const result = computeAnnualization(500000, 45000, annualBrackets);
    expect(result.yearEndAdjustment.toNumber()).toBe(-2500);
  });
});
