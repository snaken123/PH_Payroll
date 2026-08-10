import { describe, expect, it } from "vitest";
import { computePayroll } from "../engine";
import type { TimesheetFact } from "../attendance/types";
import type { BirBracketRow, PagibigBracketRow, PhilhealthConfigRow, SssBracketRow } from "../types";

function fact(overrides: Partial<TimesheetFact> = {}): TimesheetFact {
  return {
    workDate: "2026-07-16",
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
  { payPeriodType: "SEMI_MONTHLY", bracketFloor: 0, bracketCeiling: 10416, baseTax: 0, excessRate: 0 },
  { payPeriodType: "SEMI_MONTHLY", bracketFloor: 10417, bracketCeiling: 16666, baseTax: 0, excessRate: 0.15 },
  { payPeriodType: "SEMI_MONTHLY", bracketFloor: 16667, bracketCeiling: 33332, baseTax: 937.5, excessRate: 0.2 },
  { payPeriodType: "SEMI_MONTHLY", bracketFloor: 33333, bracketCeiling: 83332, baseTax: 4270.7, excessRate: 0.25 },
];

describe("computePayroll — monthly rank-and-file, statutory-deduction cutoff", () => {
  it("matches hand-computed gross-to-net for a full-attendance cutoff with a taxable allowance", () => {
    const result = computePayroll({
      payBasis: "MONTHLY_RATE",
      basicRate: 30000,
      standardWorkDaysPerMonth: 22,
      isManagerialExempt: false,
      timesheets: Array.from({ length: 11 }, () => fact()),
      allowances: [{ label: "Transportation allowance", amount: 1500, isTaxable: true }],
      isStatutoryDeductionCutoff: true,
      monthlyEquivalentCompensation: 30000,
      rates: { sssBrackets, philhealthConfig, pagibigBracket, birBrackets },
    });

    expect(result.grossPay.toNumber()).toBe(31500);
    // SSS 1500 + PhilHealth 750 + Pag-IBIG 200 = 2450
    // Taxable income = 31500 - 2450 = 29050 -> tax = 937.5 + (29050-16667)*0.2 = 3414.10
    expect(result.totalStatutoryDeductions.toNumber()).toBe(2450 + 3414.1);
    expect(result.netPay.toNumber()).toBe(31500 - 2450 - 3414.1);
  });
});

describe("computePayroll — monthly rank-and-file with an absence", () => {
  it("deducts the absence exactly once (regression: BASIC_PAY must be gross, not pre-netted)", () => {
    const result = computePayroll({
      payBasis: "MONTHLY_RATE",
      basicRate: 30000,
      standardWorkDaysPerMonth: 22,
      isManagerialExempt: false,
      timesheets: [
        ...Array.from({ length: 10 }, () => fact()),
        fact({ status: "ABSENT", regularHours: 0 }),
      ],
      allowances: [],
      isStatutoryDeductionCutoff: false,
      monthlyEquivalentCompensation: 30000,
      rates: { sssBrackets, philhealthConfig, pagibigBracket, birBrackets },
    });

    // 1 absence out of a 22-day divisor: 30,000 - (30,000/22) = 28,636.36...
    expect(result.grossPay.toNumber()).toBeCloseTo(28636.36, 2);
    const basicPayLine = result.lineItems.find((li) => li.category === "BASIC_PAY");
    const absenceLine = result.lineItems.find((li) => li.description === "Absence deduction");
    expect(basicPayLine?.amount.toNumber()).toBe(30000);
    expect(absenceLine?.amount.toNumber()).toBeCloseTo(1363.64, 2);
  });
});

describe("computePayroll — daily-paid employee, non-statutory-deduction cutoff", () => {
  it("pays no-work-no-pay for an absence and applies no statutory deductions on the first-half cutoff", () => {
    const result = computePayroll({
      payBasis: "DAILY_RATE",
      basicRate: 800,
      isManagerialExempt: false,
      timesheets: [
        ...Array.from({ length: 10 }, () => fact()),
        fact({ status: "ABSENT", regularHours: 0 }),
      ],
      allowances: [],
      isStatutoryDeductionCutoff: false,
      monthlyEquivalentCompensation: 17600,
      rates: { sssBrackets, philhealthConfig, pagibigBracket, birBrackets },
    });

    expect(result.grossPay.toNumber()).toBe(8000);
    expect(result.totalStatutoryDeductions.toNumber()).toBe(0); // below exemption threshold, no SSS/PhilHealth/Pag-IBIG this cutoff
    expect(result.netPay.toNumber()).toBe(8000);
    expect(result.lineItems.some((li) => li.category === "SSS_EE")).toBe(false);
  });
});

describe("computePayroll — loan deductions", () => {
  it("deducts an active loan installment and reports the updated balance", () => {
    const result = computePayroll({
      payBasis: "DAILY_RATE",
      basicRate: 800,
      isManagerialExempt: false,
      timesheets: Array.from({ length: 10 }, () => fact()),
      allowances: [],
      isStatutoryDeductionCutoff: false,
      monthlyEquivalentCompensation: 17600,
      rates: { sssBrackets, philhealthConfig, pagibigBracket, birBrackets },
      activeLoans: [
        {
          id: "loan-1",
          description: "Cash advance",
          installmentAmount: 1000,
          remainingBalance: 3000,
          deductionFrequency: "EVERY_CUTOFF",
        },
      ],
    });

    expect(result.totalOtherDeductions.toNumber()).toBe(1000);
    expect(result.netPay.toNumber()).toBe(8000 - 1000);
    expect(result.loanDeductions[0].balanceAfter.toNumber()).toBe(2000);
  });

  it("caps loan deductions so net pay never goes negative", () => {
    const result = computePayroll({
      payBasis: "DAILY_RATE",
      basicRate: 800,
      isManagerialExempt: false,
      timesheets: Array.from({ length: 1 }, () => fact()),
      allowances: [],
      isStatutoryDeductionCutoff: false,
      monthlyEquivalentCompensation: 17600,
      rates: { sssBrackets, philhealthConfig, pagibigBracket, birBrackets },
      activeLoans: [
        {
          id: "loan-1",
          description: "Company loan",
          installmentAmount: 5000,
          remainingBalance: 20000,
          deductionFrequency: "EVERY_CUTOFF",
        },
      ],
    });

    // Gross for 1 day = 800, all of which is available for the loan since
    // there's no statutory deduction this cutoff.
    expect(result.netPay.toNumber()).toBe(0);
    expect(result.loanDeductions[0].amountDeducted.toNumber()).toBe(800);
  });
});

describe("computePayroll — managerial-exempt employee with overtime and holiday work", () => {
  it("excludes OT/holiday premiums but still pays base holiday pay", () => {
    const result = computePayroll({
      payBasis: "MONTHLY_RATE",
      basicRate: 44000,
      standardWorkDaysPerMonth: 22,
      isManagerialExempt: true,
      timesheets: [
        fact({ overtimeHours: 3 }),
        fact({ status: "HOLIDAY", holidayType: "REGULAR_HOLIDAY" }),
      ],
      allowances: [],
      isStatutoryDeductionCutoff: false,
      monthlyEquivalentCompensation: 44000,
      rates: { sssBrackets, philhealthConfig, pagibigBracket, birBrackets },
    });

    expect(result.lineItems.some((li) => li.category === "OVERTIME")).toBe(false);
    expect(result.lineItems.some((li) => li.category === "HOLIDAY_PREMIUM")).toBe(false);
    // Base monthly pay is untouched — managerial exemption only zeroes the
    // premium/OT add-ons, not the fixed salary itself.
    expect(result.grossPay.toNumber()).toBe(44000);
  });
});

describe("computePayroll — de minimis allowance ceiling capping", () => {
  it("caps non-taxable de minimis allowances at statutory ceiling and taxes the excess", () => {
    const result = computePayroll({
      payBasis: "MONTHLY_RATE",
      basicRate: 30000,
      standardWorkDaysPerMonth: 22,
      isManagerialExempt: false,
      timesheets: Array.from({ length: 11 }, () => fact()),
      allowances: [
        {
          label: "Rice subsidy",
          amount: 2500, // exceeds semi-monthly cutoff cap of ₱1,000 (₱2,000 monthly / 2)
          isTaxable: false,
          isDeMinimis: true,
          deMinimisCategory: "RICE_SUBSIDY",
          deMinimisCeilingAmount: 2000,
          deMinimisFrequency: "MONTHLY",
        },
      ],
      isStatutoryDeductionCutoff: true,
      monthlyEquivalentCompensation: 30000,
      rates: { sssBrackets, philhealthConfig, pagibigBracket, birBrackets },
    });

    expect(result.grossPay.toNumber()).toBe(32500);
    // SSS 1500 + PhilHealth 750 + PagIBIG 200 = 2450
    // Non-taxable portion = 1000 (ceiling for semi-monthly)
    // Taxable income = 32500 - 1000 - 2450 = 29050
    // Tax = 937.5 + (29050 - 16667) * 0.2 = 3414.1
    const allowanceLine = result.lineItems.find((li) => li.category === "ALLOWANCE");
    expect(allowanceLine?.sourceRef?.nonTaxableAmount).toBe("1000");
    expect(result.totalStatutoryDeductions.toNumber()).toBe(2450 + 3414.1);
  });
});
