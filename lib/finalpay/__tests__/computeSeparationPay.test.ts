import { describe, expect, it } from "vitest";
import { computeSeparationPay } from "../computeSeparationPay";

describe("computeSeparationPay", () => {
  it("computes redundancy at 1.0 month per year of service", () => {
    const result = computeSeparationPay(20000, 5, "AUTHORIZED_CAUSE_REDUNDANCY");
    expect(result.amount.toNumber()).toBe(100000);
    expect(result.isTaxExempt).toBe(true);
  });

  it("applies the 1-month floor for short-tenure redundancy (not zero)", () => {
    // 3 months' service -> 0 years credited, but the floor still applies
    const result = computeSeparationPay(20000, 0, "AUTHORIZED_CAUSE_REDUNDANCY");
    expect(result.amount.toNumber()).toBe(20000);
  });

  it("computes retrenchment at 0.5 month per year of service", () => {
    const result = computeSeparationPay(20000, 6, "AUTHORIZED_CAUSE_RETRENCHMENT");
    expect(result.amount.toNumber()).toBe(60000);
    expect(result.isTaxExempt).toBe(true);
  });

  it("computes retrenchment for a shorter credited tenure", () => {
    const result = computeSeparationPay(20000, 5, "AUTHORIZED_CAUSE_RETRENCHMENT");
    expect(result.amount.toNumber()).toBe(50000);
  });

  it("applies the same 0.5 month/year formula for disease", () => {
    const result = computeSeparationPay(20000, 6, "AUTHORIZED_CAUSE_DISEASE");
    expect(result.amount.toNumber()).toBe(60000);
    expect(result.isTaxExempt).toBe(true);
  });

  it("applies the 1-month floor even for retrenchment with 0 years credited", () => {
    const result = computeSeparationPay(20000, 0, "AUTHORIZED_CAUSE_RETRENCHMENT");
    expect(result.amount.toNumber()).toBe(20000);
  });
});
