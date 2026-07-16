import { describe, expect, it } from "vitest";
import { estimateMonthlyEquivalentCompensation } from "../estimateMonthlyEquivalent";

describe("estimateMonthlyEquivalentCompensation", () => {
  it("returns the basic rate directly for MONTHLY_RATE", () => {
    expect(estimateMonthlyEquivalentCompensation("MONTHLY_RATE", 30000).toNumber()).toBe(30000);
  });

  it("multiplies daily rate by the configured work-days divisor", () => {
    expect(estimateMonthlyEquivalentCompensation("DAILY_RATE", 800, 22).toNumber()).toBe(17600);
  });

  it("falls back to a 22-day assumption when no divisor is configured", () => {
    expect(estimateMonthlyEquivalentCompensation("DAILY_RATE", 800).toNumber()).toBe(17600);
  });

  it("multiplies hourly rate by 8 hours and the work-days divisor", () => {
    expect(estimateMonthlyEquivalentCompensation("HOURLY_RATE", 100, 22).toNumber()).toBe(17600);
  });
});
