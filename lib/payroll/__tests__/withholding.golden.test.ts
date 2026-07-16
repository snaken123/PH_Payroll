import { describe, expect, it } from "vitest";
import { getWithholdingTax } from "../rates/getWithholdingTax";
import type { BirBracketRow } from "../types";

// Mirrors prisma/seed.ts's BirWithholdingBracket rows (TRAIN law, RR 11-2018
// Annex E, effective Jan 1 2023 onward, unchanged through 2026).
const semiMonthly: BirBracketRow[] = [
  { payPeriodType: "SEMI_MONTHLY", bracketFloor: 0, bracketCeiling: 10416, baseTax: 0, excessRate: 0 },
  { payPeriodType: "SEMI_MONTHLY", bracketFloor: 10417, bracketCeiling: 16666, baseTax: 0, excessRate: 0.15 },
  { payPeriodType: "SEMI_MONTHLY", bracketFloor: 16667, bracketCeiling: 33332, baseTax: 937.5, excessRate: 0.2 },
  { payPeriodType: "SEMI_MONTHLY", bracketFloor: 33333, bracketCeiling: 83332, baseTax: 4270.7, excessRate: 0.25 },
  { payPeriodType: "SEMI_MONTHLY", bracketFloor: 83333, bracketCeiling: 333332, baseTax: 16770.7, excessRate: 0.3 },
  { payPeriodType: "SEMI_MONTHLY", bracketFloor: 333333, bracketCeiling: null, baseTax: 91770.7, excessRate: 0.35 },
];

const monthly: BirBracketRow[] = [
  { payPeriodType: "MONTHLY", bracketFloor: 0, bracketCeiling: 20833, baseTax: 0, excessRate: 0 },
  { payPeriodType: "MONTHLY", bracketFloor: 20833, bracketCeiling: 33332, baseTax: 0, excessRate: 0.15 },
  { payPeriodType: "MONTHLY", bracketFloor: 33333, bracketCeiling: 66666, baseTax: 1875, excessRate: 0.2 },
  { payPeriodType: "MONTHLY", bracketFloor: 66667, bracketCeiling: 166666, baseTax: 8541.8, excessRate: 0.25 },
  { payPeriodType: "MONTHLY", bracketFloor: 166667, bracketCeiling: 666666, baseTax: 33541.8, excessRate: 0.3 },
  { payPeriodType: "MONTHLY", bracketFloor: 666667, bracketCeiling: null, baseTax: 183541.8, excessRate: 0.35 },
];

describe("getWithholdingTax (monthly table)", () => {
  it("is exempt at and below ₱20,833", () => {
    expect(getWithholdingTax(20833, "MONTHLY", monthly).tax.toNumber()).toBe(0);
  });

  it("matches BIR's own published example: ₱25,000/month -> ₱625.05", () => {
    const result = getWithholdingTax(25000, "MONTHLY", monthly);
    expect(result.tax.toNumber()).toBe(625.05);
  });

  it("is continuous at the bracket 3 boundary (₱33,333)", () => {
    const justBelow = getWithholdingTax(33332, "MONTHLY", monthly);
    const at = getWithholdingTax(33333, "MONTHLY", monthly);
    expect(justBelow.tax.toNumber()).toBeCloseTo(1874.85, 2);
    expect(at.tax.toNumber()).toBe(1875);
  });

  it("computes the top bracket correctly", () => {
    const result = getWithholdingTax(100000, "MONTHLY", monthly);
    expect(result.tax.toNumber()).toBe(16875.05);
  });
});

describe("getWithholdingTax (semi-monthly table)", () => {
  it("is exempt at and below ₱10,416", () => {
    expect(getWithholdingTax(10416, "SEMI_MONTHLY", semiMonthly).tax.toNumber()).toBe(0);
  });

  it("is zero exactly at the ₱10,417 bracket floor (0% base plus 0 excess)", () => {
    expect(getWithholdingTax(10417, "SEMI_MONTHLY", semiMonthly).tax.toNumber()).toBe(0);
  });

  it("computes a representative mid-bracket value", () => {
    const result = getWithholdingTax(12500, "SEMI_MONTHLY", semiMonthly);
    expect(result.tax.toNumber()).toBe(312.45);
  });

  it("only matches its own pay period type", () => {
    const combined = [...semiMonthly, ...monthly];
    const result = getWithholdingTax(25000, "MONTHLY", combined);
    expect(result.tax.toNumber()).toBe(625.05);
  });

  it("throws when no bracket covers the pay period type", () => {
    expect(() => getWithholdingTax(25000, "WEEKLY", semiMonthly)).toThrow();
  });
});
