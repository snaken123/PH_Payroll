import { describe, expect, it } from "vitest";
import { computeBasePay } from "../attendance/computeBasePay";
import type { TimesheetFact } from "../attendance/types";

function fact(overrides: Partial<TimesheetFact> = {}): TimesheetFact {
  return {
    workDate: "2026-07-01",
    status: "PRESENT",
    regularHours: 8,
    overtimeHours: 0,
    nightDiffHours: 0,
    lateMinutes: 0,
    undertimeMinutes: 0,
    holidayType: null,
    isRestDay: false,
    ...overrides,
  };
}

describe("computeBasePay — MONTHLY_RATE", () => {
  const standardWorkDaysPerMonth = 22; // simplified divisor for round numbers

  it("pays the full monthly rate when every day is present", () => {
    const result = computeBasePay({
      payBasis: "MONTHLY_RATE",
      basicRate: 22000,
      standardWorkDaysPerMonth,
      timesheets: Array.from({ length: 11 }, () => fact()),
    });
    expect(result.basePay.toNumber()).toBe(22000);
    expect(result.dailyRateEquivalent.toNumber()).toBe(1000);
  });

  it("deducts a full day's rate per absence", () => {
    const result = computeBasePay({
      payBasis: "MONTHLY_RATE",
      basicRate: 22000,
      standardWorkDaysPerMonth,
      timesheets: [fact(), fact({ status: "ABSENT", regularHours: 0 })],
    });
    expect(result.absenceDeduction.toNumber()).toBe(1000);
    expect(result.basePay.toNumber()).toBe(21000);
  });

  it("deducts half a day's rate for a half day", () => {
    const result = computeBasePay({
      payBasis: "MONTHLY_RATE",
      basicRate: 22000,
      standardWorkDaysPerMonth,
      timesheets: [fact({ status: "HALF_DAY", regularHours: 4 })],
    });
    expect(result.absenceDeduction.toNumber()).toBe(500);
  });

  it("deducts late/undertime minutes at the hourly-equivalent rate", () => {
    const result = computeBasePay({
      payBasis: "MONTHLY_RATE",
      basicRate: 22000,
      standardWorkDaysPerMonth,
      timesheets: [fact({ lateMinutes: 30, undertimeMinutes: 30 })],
    });
    // dailyRate 1000 -> hourlyRate 125; 60 minutes -> full hourly rate deducted
    expect(result.lateUndertimeDeduction.toNumber()).toBe(125);
  });

  it("throws without a divisor", () => {
    expect(() =>
      computeBasePay({ payBasis: "MONTHLY_RATE", basicRate: 22000, timesheets: [fact()] })
    ).toThrow();
  });
});

describe("computeBasePay — DAILY_RATE", () => {
  it("pays only for hours actually worked (no work, no pay)", () => {
    const result = computeBasePay({
      payBasis: "DAILY_RATE",
      basicRate: 800,
      timesheets: [fact(), fact({ status: "ABSENT", regularHours: 0 })],
    });
    expect(result.basePay.toNumber()).toBe(800);
  });

  it("pays 100% for an unworked regular holiday", () => {
    const result = computeBasePay({
      payBasis: "DAILY_RATE",
      basicRate: 800,
      timesheets: [fact({ status: "HOLIDAY", holidayType: "REGULAR_HOLIDAY", regularHours: 0 })],
    });
    expect(result.basePay.toNumber()).toBe(800);
  });

  it("pays nothing for an unworked special non-working day", () => {
    const result = computeBasePay({
      payBasis: "DAILY_RATE",
      basicRate: 800,
      timesheets: [fact({ status: "HOLIDAY", holidayType: "SPECIAL_NON_WORKING", regularHours: 0 })],
    });
    expect(result.basePay.toNumber()).toBe(0);
  });
});

describe("computeBasePay — HOURLY_RATE", () => {
  it("pays hourly rate times regular hours only", () => {
    const result = computeBasePay({
      payBasis: "HOURLY_RATE",
      basicRate: 100,
      timesheets: [fact({ regularHours: 8 }), fact({ regularHours: 6 })],
    });
    expect(result.basePay.toNumber()).toBe(1400);
  });
});
