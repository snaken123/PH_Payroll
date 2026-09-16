import { describe, it, expect } from "vitest";
import { Decimal } from "decimal.js";
import { estimateMonthlyEquivalentCompensation } from "../estimateMonthlyEquivalent";
import { computePayroll } from "../engine";
import { calculateTimesheetHours } from "@/lib/attendance/calculateHours";

describe("Company Payroll & Attendance Verification Rules", () => {
  it("Rule 1: verifies standardWorkDaysPerMonth defaults to 26 days across calculations", () => {
    // 26 days * ₱1,000/day = ₱26,000 monthly equivalent
    const monthlyComp = estimateMonthlyEquivalentCompensation({
      payBasis: "DAILY_RATE",
      basicRate: 1000,
    });
    expect(monthlyComp.toNumber()).toBe(26000);
  });

  it("Rule 2: verifies default office hours start at 9:30 AM (09:30)", () => {
    // Clock in at 09:30 AM, clock out at 18:30 (6:30 PM) -> 8.0 regular hours, 0 late
    const onTimeResult = calculateTimesheetHours({
      timeIn: "09:30",
      timeOut: "18:30",
    });
    expect(onTimeResult.lateMinutes).toBe(0);
    expect(onTimeResult.regularHours).toBe(8);

    // Clock in at 10:00 AM (past 09:30 + 15 min grace = 09:45) -> 30 minutes late
    const lateResult = calculateTimesheetHours({
      timeIn: "10:00",
      timeOut: "18:30",
    });
    expect(lateResult.lateMinutes).toBe(30);
  });

  it("Rule 3: verifies allowances paid by a non-root company have NO statutory contributions and are NON-TAXABLE", () => {
    const rootCompanyId = "comp_root_123";
    const subsidiaryCompanyId = "comp_sub_456";

    const allowances = [
      {
        label: "Cross-Company Travel Allowance",
        amount: 5000,
        frequency: "MONTHLY" as const,
        isTaxable: true, // marked taxable on subsidiary, but paid by non-root company
        payingCompanyId: subsidiaryCompanyId,
      },
    ];

    // 1. Statutory Contribution base excludes cross-company allowance
    const monthlyComp = estimateMonthlyEquivalentCompensation({
      payBasis: "MONTHLY_RATE",
      basicRate: 30000,
      currentCompanyId: rootCompanyId,
      allowances,
    });
    expect(monthlyComp.toNumber()).toBe(30000); // 5000 allowance excluded from SSS/PhilHealth/Pagibig base

    // 2. Tax computation treats cross-company allowance as NON-TAXABLE
    const result = computePayroll({
      payBasis: "MONTHLY_RATE",
      basicRate: 30000,
      standardWorkDaysPerMonth: 26,
      isManagerialExempt: false,
      currentCompanyId: rootCompanyId,
      timesheets: [],
      allowances,
      isStatutoryDeductionCutoff: false,
      monthlyEquivalentCompensation: 30000,
      rates: {
        sssBrackets: [],
        philhealthConfig: {
          id: "1",
          effectiveFrom: new Date(),
          effectiveTo: null,
          premiumRate: new Decimal("0.05"),
          eeShareRate: new Decimal("0.025"),
          erShareRate: new Decimal("0.025"),
          floorSalary: new Decimal("10000"),
          ceilingSalary: new Decimal("100000"),
          sourceReference: "test",
        },
        pagibigBracket: {
          id: "1",
          effectiveFrom: new Date(),
          effectiveTo: null,
          salaryThreshold: new Decimal("1500"),
          eeRateBelowThreshold: new Decimal("0.01"),
          erRateBelowThreshold: new Decimal("0.02"),
          eeRateAboveThreshold: new Decimal("0.02"),
          erRateAboveThreshold: new Decimal("0.02"),
          maxFundSalary: new Decimal("5000"),
          eeCap: new Decimal("100"),
          erCap: new Decimal("100"),
          sourceReference: "test",
        },
        birBrackets: [
          {
            id: "1",
            effectiveFrom: new Date(),
            effectiveTo: null,
            payPeriodType: "SEMI_MONTHLY",
            bracketFloor: new Decimal("0"),
            bracketCeiling: new Decimal("100000"),
            baseTax: new Decimal("0"),
            excessRate: new Decimal("0"),
            sourceReference: "test",
          },
        ],
      },
    });

    const allowanceItem = result.lineItems.find((l) => l.description === "Cross-Company Travel Allowance");
    expect(allowanceItem).toBeDefined();
    if (allowanceItem && allowanceItem.sourceRef) {
      expect(allowanceItem.sourceRef.nonTaxableAmount).toBe("5000");
    }
  });
});
