import { describe, expect, it } from "vitest";
import { computeHolidayPremium } from "../attendance/computeHolidayPremium";
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

const dailyRate = 1000;

describe("computeHolidayPremium", () => {
  it("adds a +100% premium for a worked regular holiday (200% total)", () => {
    const result = computeHolidayPremium(
      [fact({ status: "HOLIDAY", holidayType: "REGULAR_HOLIDAY" })],
      dailyRate,
      false
    );
    expect(result.regularHolidayWorkedPremium.toNumber()).toBe(1000);
  });

  it("adds a +160% premium for a worked regular holiday that's also a rest day (260% total)", () => {
    const result = computeHolidayPremium(
      [fact({ status: "HOLIDAY", holidayType: "REGULAR_HOLIDAY", isRestDay: true })],
      dailyRate,
      false
    );
    expect(result.regularHolidayWorkedPremium.toNumber()).toBe(1600);
  });

  it("adds a +30% premium for a worked special non-working day (130% total)", () => {
    const result = computeHolidayPremium(
      [fact({ status: "HOLIDAY", holidayType: "SPECIAL_NON_WORKING" })],
      dailyRate,
      false
    );
    expect(result.specialNonWorkingWorkedPremium.toNumber()).toBe(300);
  });

  it("adds a +50% premium for a worked special non-working day that's also a rest day (150% total)", () => {
    const result = computeHolidayPremium(
      [fact({ status: "HOLIDAY", holidayType: "SPECIAL_NON_WORKING", isRestDay: true })],
      dailyRate,
      false
    );
    expect(result.specialNonWorkingWorkedPremium.toNumber()).toBe(500);
  });

  it("adds a +30% premium for an ordinary worked rest day (130% total)", () => {
    const result = computeHolidayPremium([fact({ isRestDay: true })], dailyRate, false);
    expect(result.restDayWorkedPremium.toNumber()).toBe(300);
  });

  it("adds no premium for an unworked holiday (base pay handled elsewhere)", () => {
    const result = computeHolidayPremium(
      [fact({ status: "HOLIDAY", holidayType: "REGULAR_HOLIDAY", regularHours: 0 })],
      dailyRate,
      false
    );
    expect(result.totalPremium.toNumber()).toBe(0);
  });

  it("zeroes all premiums for managerial-exempt employees", () => {
    const result = computeHolidayPremium(
      [fact({ status: "HOLIDAY", holidayType: "REGULAR_HOLIDAY", isRestDay: true })],
      dailyRate,
      true
    );
    expect(result.totalPremium.toNumber()).toBe(0);
  });
});
