import { describe, it, expect } from "vitest";
import { computePayroll } from "../engine";

describe("Saturday Undertime Exclusion", () => {
  it("excludes undertime on Saturday when timesheet lateMinutes/undertimeMinutes are zeroed out", () => {
    // Saturday date: 2026-09-05 (Saturday)
    const satDate = "2026-09-05T00:00:00.000Z";
    const friDate = "2026-09-04T00:00:00.000Z";

    const resultExcluded = computePayroll({
      payBasis: "MONTHLY_RATE",
      basicRate: "30000",
      monthlyEquivalentCompensation: "30000",
      isManagerialExempt: false,
      isSemiMonthly: true,
      cutoffType: "FIRST_HALF",
      isStatutoryDeductionCutoff: false,
      standardWorkDaysPerMonth: "26",
      timesheets: [
        {
          workDate: satDate,
          status: "PRESENT",
          regularHours: "8",
          overtimeHours: "0",
          nightDiffHours: "0",
          lateMinutes: 0, // Zeroed out because excludeSaturdayUndertime is true
          undertimeMinutes: 0,
          holidayType: null,
          isRestDay: false,
        },
        {
          workDate: friDate,
          status: "PRESENT",
          regularHours: "8",
          overtimeHours: "0",
          nightDiffHours: "0",
          lateMinutes: 30, // Friday late minutes remain
          undertimeMinutes: 0,
          holidayType: null,
          isRestDay: false,
        },
      ],
      allowances: [],
      activeLoans: [],
      rates: {
        sssBrackets: [],
        philhealthConfig: {
          premiumRate: "0.05",
          eeShareRate: "0.5",
          erShareRate: "0.5",
          floorSalary: "10000",
          ceilingSalary: "100000",
        },
        pagibigBracket: {
          salaryThreshold: "1500",
          eeRateBelowThreshold: "0.01",
          erRateBelowThreshold: "0.02",
          eeRateAboveThreshold: "0.02",
          erRateAboveThreshold: "0.02",
          maxFundSalary: "5000",
          eeCap: "100",
          erCap: "100",
        },
        birBrackets: [
          {
            payPeriodType: "SEMI_MONTHLY",
            bracketFloor: "0",
            bracketCeiling: null,
            baseTax: "0",
            excessRate: "0",
          },
        ],
      },
    });

    const lateDeductions = resultExcluded.lineItems.filter(
      (item) => item.category === "LATE_UNDERTIME_DEDUCTION"
    );

    // Only Friday's 30 mins late (0.5 hrs) should be deducted
    expect(lateDeductions.length).toBe(1);
    expect(Number(lateDeductions[0].amount)).toBeCloseTo(72.12, 1);
  });
});
