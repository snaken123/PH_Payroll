import { describe, expect, it } from "vitest";
import { estimateDailyRateEquivalent } from "../estimateDailyRateEquivalent";

describe("estimateDailyRateEquivalent", () => {
  it("returns the rate directly for DAILY_RATE", () => {
    expect(estimateDailyRateEquivalent("DAILY_RATE", 800).toNumber()).toBe(800);
  });

  it("multiplies by 8 hours for HOURLY_RATE", () => {
    expect(estimateDailyRateEquivalent("HOURLY_RATE", 100).toNumber()).toBe(800);
  });

  it("divides by the configured work-days divisor for MONTHLY_RATE", () => {
    expect(estimateDailyRateEquivalent("MONTHLY_RATE", 22000, 22).toNumber()).toBe(1000);
  });

  it("falls back to a 22-day assumption when no divisor is configured", () => {
    expect(estimateDailyRateEquivalent("MONTHLY_RATE", 22000).toNumber()).toBe(1000);
  });
});
