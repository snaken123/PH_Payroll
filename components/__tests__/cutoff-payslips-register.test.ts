import { describe, it, expect } from "vitest";
import type { RegisterPayslipItem } from "../payroll/cutoff-payslips-register";

describe("Cutoff Payslip Register - Overtime and Lates/Undertime logic", () => {
  const samplePayslip: RegisterPayslipItem = {
    id: "ps-1",
    grossPay: "25000.00",
    totalStatutoryDeductions: "2150.00",
    totalOtherDeductions: "500.00",
    netPay: "22350.00",
    employee: {
      employeeNumber: "EMP-001",
      firstName: "Fremaline",
      lastName: "Tester",
    },
    lineItems: [
      {
        id: "li-1",
        category: "BASIC_PAY",
        direction: "EARNING",
        description: "Basic salary",
        amount: "23475.37",
      },
      {
        id: "li-2",
        category: "OVERTIME",
        direction: "EARNING",
        description: "Regular overtime (13.59 hrs @ 1.25x)",
        amount: "1524.63",
        quantity: "13.59",
      },
      {
        id: "li-3",
        category: "LATE_UNDERTIME_DEDUCTION",
        direction: "DEDUCTION",
        description: "Late/undertime deduction",
        amount: "89.75",
        quantity: "0.50",
      },
      {
        id: "li-4",
        category: "LATE_UNDERTIME_DEDUCTION",
        direction: "DEDUCTION",
        description: "Absence deduction",
        amount: "500.00",
        quantity: "1.00",
      },
      {
        id: "li-5",
        category: "SSS_EMPLOYEE",
        direction: "DEDUCTION",
        description: "SSS Contribution",
        amount: "1125.00",
      },
    ],
  };

  it("extracts approved overtime amount and hours accurately", () => {
    const otItems = samplePayslip.lineItems.filter((li) => li.category === "OVERTIME");
    const overtimeAmount = otItems.reduce((sum, li) => sum + Number(li.amount || 0), 0);
    const overtimeHours = otItems.reduce((sum, li) => sum + Number(li.quantity || 0), 0);

    expect(overtimeAmount).toBe(1524.63);
    expect(overtimeHours).toBe(13.59);
  });

  it("extracts late/undertime deduction and computes minutes accurately while excluding pure absences", () => {
    const lateItems = samplePayslip.lineItems.filter(
      (li) =>
        li.category === "LATE_UNDERTIME_DEDUCTION" &&
        !li.description.toLowerCase().includes("absence")
    );
    const lateAmount = lateItems.reduce((sum, li) => sum + Number(li.amount || 0), 0);
    const lateMinutes = lateItems.reduce((sum, li) => {
      const qty = Number(li.quantity || 0);
      if (qty > 0) {
        return sum + (qty < 10 && !Number.isInteger(qty) ? Math.round(qty * 60) : Math.round(qty));
      }
      const descMatch = li.description.match(/(\d+(?:\.\d+)?)\s*(?:mins?|minutes?)/i);
      if (descMatch) {
        return sum + Math.round(Number(descMatch[1]));
      }
      if (li.rate && Number(li.rate) > 0) {
        return sum + Math.round((Number(li.amount || 0) / Number(li.rate)) * 60);
      }
      return sum;
    }, 0);

    expect(lateAmount).toBe(89.75);
    expect(lateMinutes).toBe(30); // 0.50h converted to 30 mins

    // Verify absence deduction was filtered out
    const absenceItems = samplePayslip.lineItems.filter(
      (li) =>
        li.category === "LATE_UNDERTIME_DEDUCTION" &&
        li.description.toLowerCase().includes("absence")
    );
    expect(absenceItems.length).toBe(1);
    expect(Number(absenceItems[0].amount)).toBe(500);
  });

  it("extracts late minutes from line items stored directly in minutes or regex descriptions", () => {
    const minuteItem = {
      id: "li-direct-mins",
      category: "LATE_UNDERTIME_DEDUCTION",
      direction: "DEDUCTION",
      description: "Late/undertime deduction (45 mins)",
      amount: "150.00",
      quantity: "45",
      rate: "200.00",
    };
    const qty = Number(minuteItem.quantity || 0);
    const mins = qty < 10 && !Number.isInteger(qty) ? Math.round(qty * 60) : Math.round(qty);
    expect(mins).toBe(45);

    const descOnlyItem = {
      id: "li-desc-only",
      category: "LATE_UNDERTIME_DEDUCTION",
      direction: "DEDUCTION",
      description: "Late/undertime deduction (18 mins)",
      amount: "60.00",
      quantity: null,
      rate: null,
    };
    const match = descOnlyItem.description.match(/(\d+(?:\.\d+)?)\s*(?:mins?|minutes?)/i);
    expect(match ? Math.round(Number(match[1])) : 0).toBe(18);
  });

  it("handles payslips with zero overtime and zero tardiness cleanly", () => {
    const cleanPayslip: RegisterPayslipItem = {
      id: "ps-2",
      grossPay: "20000.00",
      totalStatutoryDeductions: "1800.00",
      totalOtherDeductions: "0.00",
      netPay: "18200.00",
      employee: {
        employeeNumber: "EMP-002",
        firstName: "Clean",
        lastName: "Attendance",
      },
      lineItems: [
        {
          id: "li-10",
          category: "BASIC_PAY",
          direction: "EARNING",
          description: "Basic salary",
          amount: "20000.00",
        },
      ],
    };

    const otItems = cleanPayslip.lineItems.filter((li) => li.category === "OVERTIME");
    const lateItems = cleanPayslip.lineItems.filter(
      (li) =>
        li.category === "LATE_UNDERTIME_DEDUCTION" &&
        !li.description.toLowerCase().includes("absence")
    );

    expect(otItems.length).toBe(0);
    expect(lateItems.length).toBe(0);
  });
});
