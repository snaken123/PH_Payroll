import { describe, expect, it } from "vitest";
import { computePayroll } from "../engine";
import type { TimesheetFact } from "../attendance/types";
import type { BirBracketRow, PagibigBracketRow, PhilhealthConfigRow, SssBracketRow } from "../types";

function makeTimesheet(): TimesheetFact {
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
  { payPeriodType: "SEMI_MONTHLY", bracketFloor: 0, bracketCeiling: null, baseTax: 1000, excessRate: 0.2 },
];

describe("Withholding Tax Exemption Toggle", () => {
  it("computes withholding tax when isDeductWithholdingTax is true", () => {
    const result = computePayroll({
      payBasis: "MONTHLY_RATE",
      basicRate: 50000,
      monthlyEquivalentCompensation: 50000,
      standardWorkDaysPerMonth: 26,
      isManagerialExempt: false,
      isDeductWithholdingTax: true,
      timesheets: [makeTimesheet()],
      allowances: [],
      isStatutoryDeductionCutoff: false,
      rates: { sssBrackets, philhealthConfig, pagibigBracket, birBrackets },
    });

    const taxLine = result.lineItems.find((li) => li.category === "WITHHOLDING_TAX");
    expect(taxLine).toBeDefined();
    expect(Number(taxLine?.amount)).toBeGreaterThan(0);
  });

  it("zeroes withholding tax when isDeductWithholdingTax is false", () => {
    const result = computePayroll({
      payBasis: "MONTHLY_RATE",
      basicRate: 50000,
      monthlyEquivalentCompensation: 50000,
      standardWorkDaysPerMonth: 26,
      isManagerialExempt: false,
      isDeductWithholdingTax: false, // Disabled
      timesheets: [makeTimesheet()],
      allowances: [],
      isStatutoryDeductionCutoff: false,
      rates: { sssBrackets, philhealthConfig, pagibigBracket, birBrackets },
    });

    const taxLine = result.lineItems.find((li) => li.category === "WITHHOLDING_TAX");
    expect(taxLine).toBeUndefined();
  });
});
