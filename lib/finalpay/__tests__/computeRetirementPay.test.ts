import { describe, expect, it } from "vitest";
import { computeRetirementPay } from "../computeRetirementPay";

describe("computeRetirementPay", () => {
  it("matches the RA 7641 formula: dailyRate x 22.5 x years", () => {
    const result = computeRetirementPay(800, 10);
    expect(result.amount.toNumber()).toBe(180000);
    expect(result.isTaxExempt).toBe(true);
  });

  it("is zero for zero years credited", () => {
    const result = computeRetirementPay(800, 0);
    expect(result.amount.toNumber()).toBe(0);
  });
});
