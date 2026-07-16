import { describe, expect, it } from "vitest";
import { computeExpandedWithholdingTax } from "../computeExpandedWithholdingTax";

describe("computeExpandedWithholdingTax", () => {
  it("computes a flat percentage of gross", () => {
    const result = computeExpandedWithholdingTax(50000, 0.1);
    expect(result.ewtAmount.toNumber()).toBe(5000);
    expect(result.netAmount.toNumber()).toBe(45000);
  });

  it("handles a 5% rate", () => {
    const result = computeExpandedWithholdingTax(20000, 0.05);
    expect(result.ewtAmount.toNumber()).toBe(1000);
    expect(result.netAmount.toNumber()).toBe(19000);
  });

  it("rounds to 2 decimal places", () => {
    const result = computeExpandedWithholdingTax(100, 0.15);
    expect(result.ewtAmount.toNumber()).toBe(15);
  });
});
