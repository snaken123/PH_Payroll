import { describe, expect, it } from "vitest";
import { getSssContribution } from "../rates/getSssContribution";
import type { SssBracketRow } from "../types";

// Fixed fixture mirroring prisma/seed.ts's generateSssBrackets() output for
// 2025-2026 (15% total, 10/5 split, MSC 5,000-35,000, MPF above 20,000, EC
// 10/30 at the 15,000 threshold) — NOT read from the live seeded DB, so this
// test keeps proving 2025-2026 correctness even after the real rate table is
// superseded by a future circular.
function bracket(msc: number, mscFloor: number, mscCeiling: number): SssBracketRow {
  const regularMsc = Math.min(msc, 20000);
  const mpfMsc = Math.max(msc - 20000, 0);
  return {
    mscFloor,
    mscCeiling,
    msc,
    eeShare: regularMsc * 0.05,
    erShare: regularMsc * 0.1,
    mpfEeShare: mpfMsc * 0.05,
    mpfErShare: mpfMsc * 0.1,
    ecAmount: msc < 15000 ? 10 : 30,
  };
}

const brackets: SssBracketRow[] = [
  bracket(5000, 0, 5250),
  bracket(14500, 14251, 14750),
  bracket(15000, 14751, 15250),
  bracket(20000, 19751, 20250),
  bracket(20500, 20251, 20750),
  bracket(35000, 34751, 999999999),
];

describe("getSssContribution", () => {
  it("computes the minimum bracket (MSC 5,000)", () => {
    const result = getSssContribution(5000, brackets);
    expect(result.eeShare.toNumber()).toBe(250);
    expect(result.erShare.toNumber()).toBe(500);
    expect(result.ecAmount.toNumber()).toBe(10);
    expect(result.totalEmployeeContribution.toNumber()).toBe(250);
  });

  it("applies the EC step-up at the 15,000 MSC threshold", () => {
    const below = getSssContribution(14500, brackets);
    const at = getSssContribution(15000, brackets);
    expect(below.ecAmount.toNumber()).toBe(10);
    expect(at.ecAmount.toNumber()).toBe(30);
  });

  it("has zero MPF exactly at the 20,000 MSC threshold", () => {
    const result = getSssContribution(20000, brackets);
    expect(result.mpfEeShare.toNumber()).toBe(0);
    expect(result.mpfErShare.toNumber()).toBe(0);
  });

  it("splits regular SS and MPF just above the 20,000 MSC threshold", () => {
    const result = getSssContribution(20500, brackets);
    expect(result.eeShare.toNumber()).toBe(1000); // 20,000 * 5%
    expect(result.mpfEeShare.toNumber()).toBe(25); // 500 * 5%
    expect(result.erShare.toNumber()).toBe(2000); // 20,000 * 10%
    expect(result.mpfErShare.toNumber()).toBe(50); // 500 * 10%
  });

  it("matches the officially-cited totals at the 35,000 MSC ceiling (₱40,000 salary)", () => {
    // Cross-checked against a published worked example: employee total
    // ₱1,750, employer total ₱3,530 (incl. EC) at the MSC ceiling.
    const result = getSssContribution(40000, brackets);
    expect(result.totalEmployeeContribution.toNumber()).toBe(1750);
    expect(result.totalEmployerContribution.toNumber()).toBe(3530);
  });

  it("throws when compensation falls outside every seeded bracket", () => {
    const sparseBrackets: SssBracketRow[] = [bracket(20000, 19751, 20250)];
    expect(() => getSssContribution(5000, sparseBrackets)).toThrow();
  });
});
