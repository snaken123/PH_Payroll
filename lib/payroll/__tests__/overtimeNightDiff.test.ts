import { describe, expect, it } from "vitest";
import { computeOvertimeNightDiff } from "../attendance/computeOvertimeNightDiff";
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

describe("computeOvertimeNightDiff", () => {
  it("pays overtime at 125% of the hourly rate", () => {
    const result = computeOvertimeNightDiff([fact({ overtimeHours: 2 })], 100, false);
    expect(result.overtimePay.toNumber()).toBe(250); // 2 * 100 * 1.25
  });

  it("pays night differential as a straight +10% add-on", () => {
    const result = computeOvertimeNightDiff([fact({ nightDiffHours: 4 })], 100, false);
    expect(result.nightDiffPay.toNumber()).toBe(40); // 4 * 100 * 0.10
  });

  it("stacks overtime and night differential independently", () => {
    const result = computeOvertimeNightDiff(
      [fact({ overtimeHours: 2, nightDiffHours: 2 })],
      100,
      false
    );
    expect(result.overtimePay.toNumber()).toBe(250);
    expect(result.nightDiffPay.toNumber()).toBe(20);
  });

  it("zeroes both premiums for managerial-exempt employees", () => {
    const result = computeOvertimeNightDiff(
      [fact({ overtimeHours: 2, nightDiffHours: 2 })],
      100,
      true
    );
    expect(result.overtimePay.toNumber()).toBe(0);
    expect(result.nightDiffPay.toNumber()).toBe(0);
    // Hours are still reported for visibility even though pay is zeroed.
    expect(result.overtimeHours.toNumber()).toBe(2);
  });
});
