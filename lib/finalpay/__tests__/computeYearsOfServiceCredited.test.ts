import { describe, expect, it } from "vitest";
import { computeYearsOfServiceCredited } from "../computeYearsOfServiceCredited";

describe("computeYearsOfServiceCredited", () => {
  it("credits exactly 5 years of service as 5 years", () => {
    const result = computeYearsOfServiceCredited(new Date("2021-01-15"), new Date("2026-01-15"));
    expect(result).toBe(5);
  });

  it("does not credit a partial year under 6 months", () => {
    const result = computeYearsOfServiceCredited(new Date("2026-01-15"), new Date("2026-04-15"));
    expect(result).toBe(0);
  });

  it("rounds up a fraction of at least 6 months to the next whole year", () => {
    // 5 years 7 months
    const result = computeYearsOfServiceCredited(new Date("2020-06-15"), new Date("2026-01-15"));
    expect(result).toBe(6);
  });

  it("truncates a fraction under 6 months", () => {
    // 5 years 4 months
    const result = computeYearsOfServiceCredited(new Date("2020-09-15"), new Date("2026-01-15"));
    expect(result).toBe(5);
  });

  it("is exactly at the 6-month boundary (inclusive)", () => {
    const result = computeYearsOfServiceCredited(new Date("2025-07-15"), new Date("2026-01-15"));
    expect(result).toBe(1);
  });

  it("is just under the 6-month boundary (excluded)", () => {
    const result = computeYearsOfServiceCredited(new Date("2025-07-16"), new Date("2026-01-15"));
    expect(result).toBe(0);
  });
});
