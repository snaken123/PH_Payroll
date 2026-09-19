import { describe, expect, it } from "vitest";
import { computePayroll } from "../engine";
import type { TimesheetFact } from "../attendance/types";
import type { BirBracketRow, PagibigBracketRow, PhilhealthConfigRow, SssBracketRow } from "../types";

function makeTimesheet(overtimeHours: number): TimesheetFact {
  return {
    workDate: "2026-07-01",
    status: "PRESENT",
    regularHours: 8,
    overtimeHours,
    nightDiffHours: 0,
    lateMinutes: 0,
    undertimeMinutes: 0,
    holidayType: null,
    isRestDay: false,
  };
}

const sssBrackets: SssBracketRow[] = [
  { mscFloor: 0, mscCeiling: 999999999, msc: 30000, eeShare: 1000, erShare: 2000, mpfEeShare: 500, mpfErShare: 1000, ecAmount: 30 },
];
const philhealthConfig: PhilhealthConfigRow = {
  premiumRate: 0.05,
  eeShareRate: 0.025,
  erShareRate: 0.025,
  floorSalary: 10000,
  ceilingSalary: 100000,
};
const pagibigBracket: PagibigBracketRow = {
  salaryThreshold: 1500,
  eeRateBelowThreshold: 0.01,
  erRateBelowThreshold: 0.02,
  eeRateAboveThreshold: 0.02,
  erRateAboveThreshold: 0.02,
  maxFundSalary: 10000,
  eeCap: 200,
  erCap: 200,
};
const birBrackets: BirBracketRow[] = [
  { payPeriodType: "SEMI_MONTHLY", bracketFloor: 0, bracketCeiling: null, baseTax: 0, excessRate: 0 },
];

describe("Overtime Approval Gate in Payroll Engine", () => {
  it("computes overtime pay when overtime hours are passed (approved OT)", () => {
    const result = computePayroll({
      payBasis: "MONTHLY_RATE",
      basicRate: 26000,
      monthlyEquivalentCompensation: 26000,
      standardWorkDaysPerMonth: 26,
      isManagerialExempt: false,
      timesheets: [makeTimesheet(2)], // 2 hrs OT approved
      allowances: [],
      isStatutoryDeductionCutoff: false,
      rates: { sssBrackets, philhealthConfig, pagibigBracket, birBrackets },
    });

    const otLine = result.lineItems.find((li) => li.category === "OVERTIME");
    expect(otLine).toBeDefined();
    expect(Number(otLine?.amount)).toBeGreaterThan(0);
  });

  it("zeroes overtime pay when overtime hours are passed as 0 (unapproved OT)", () => {
    const result = computePayroll({
      payBasis: "MONTHLY_RATE",
      basicRate: 26000,
      monthlyEquivalentCompensation: 26000,
      standardWorkDaysPerMonth: 26,
      isManagerialExempt: false,
      timesheets: [makeTimesheet(0)], // 0 hrs OT (unapproved)
      allowances: [],
      isStatutoryDeductionCutoff: false,
      rates: { sssBrackets, philhealthConfig, pagibigBracket, birBrackets },
    });

    const otLine = result.lineItems.find((li) => li.category === "OVERTIME");
    expect(otLine).toBeUndefined();
  });
});
