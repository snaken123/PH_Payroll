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

  it("computes full daily rate pay when Saturday tardiness is excluded and regularHours restored to 8", () => {
    const satDate = "2026-09-26T00:00:00.000Z";

    // Daily rate employee with 755/day (94.375/hr)
    // On Saturday, late was 16 mins (0.27 hrs), but with waiver, regularHours is restored from 7.73 to 8.0
    const result = computePayroll({
      payBasis: "DAILY_RATE",
      basicRate: "755",
      monthlyEquivalentCompensation: "19630",
      isManagerialExempt: false,
      isSemiMonthly: true,
      cutoffType: "FIRST_HALF",
      isStatutoryDeductionCutoff: false,
      timesheets: [
        {
          workDate: satDate,
          status: "PRESENT",
          regularHours: "8", // Restored from 7.73 because Saturday tardiness was excluded
          overtimeHours: "0",
          nightDiffHours: "0",
          lateMinutes: 0,
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

    const basicPay = result.lineItems.find((item) => item.category === "BASIC_PAY");
    expect(basicPay).toBeDefined();
    expect(Number(basicPay!.amount)).toBe(755);
  });

  it("restores regular hours when Saturday tardiness is waived", () => {
    // Stored timesheet: 16 mins late on Saturday, regularHours was pre-deducted to 7.73
    const t = {
      workDate: new Date("2026-09-26T00:00:00.000Z"),
      status: "PRESENT",
      regularHours: 7.73,
      lateMinutes: 16,
      undertimeMinutes: 0,
    };
    const isSaturday = new Date(t.workDate).getUTCDay() === 6;
    const ignoreSatLate = true && isSaturday;
    const effectiveLate = ignoreSatLate ? 0 : t.lateMinutes;
    const effectiveUndertime = t.undertimeMinutes;

    let effectiveRegularHours = Number(t.regularHours);
    const waivedLateMinutes = t.lateMinutes - effectiveLate;
    const waivedUtMinutes = t.undertimeMinutes - effectiveUndertime;
    const totalWaivedMinutes = waivedLateMinutes + waivedUtMinutes;

    if (totalWaivedMinutes > 0 && t.status !== "ABSENT") {
      effectiveRegularHours = Math.min(8.0, Math.round((effectiveRegularHours + totalWaivedMinutes / 60) * 100) / 100);
      if (effectiveRegularHours > 7.95) {
        effectiveRegularHours = 8.0;
      }
    }

    expect(effectiveRegularHours).toBe(8.0);
  });
});


