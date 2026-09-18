import { describe, it, expect } from "vitest";

describe("Company Payout Special Report Logic", () => {
  it("correctly segregates internal and intercompany payouts per company", () => {
    const companies = [
      { id: "co-1", name: "Company A" },
      { id: "co-2", name: "Company B" },
    ];

    const employees = [
      { id: "emp-1", name: "Juan Cruz", primaryCompanyId: "co-1" },
      { id: "emp-2", name: "Maria Santos", primaryCompanyId: "co-2" },
    ];

    const payslips = [
      {
        id: "ps-1",
        employeeId: "emp-1",
        companyId: "co-1",
        grossPay: 20000,
        statutoryDeductions: 2000,
        otherDeductions: 500,
        netPay: 17500,
        allowances: [],
      },
      {
        id: "ps-2",
        employeeId: "emp-2",
        companyId: "co-2",
        grossPay: 25000,
        statutoryDeductions: 2500,
        otherDeductions: 1000,
        netPay: 21500,
        allowances: [
          { label: "Executive Allowance", amount: 5000, payingCompanyId: "co-1" },
        ],
      },
    ];

    // Compute internal vs intercompany payouts
    const reportMap = new Map();
    for (const c of companies) {
      reportMap.set(c.id, {
        companyId: c.id,
        name: c.name,
        internal: [],
        intercompany: [],
        totalInternalNet: 0,
        totalIntercompanyNet: 0,
      });
    }

    for (const ps of payslips) {
      const emp = employees.find((e) => e.id === ps.employeeId)!;
      const internalReport = reportMap.get(emp.primaryCompanyId);
      if (internalReport) {
        internalReport.internal.push({ employeeId: emp.id, netPay: ps.netPay });
        internalReport.totalInternalNet += ps.netPay;
      }

      for (const a of ps.allowances) {
        if (a.payingCompanyId && a.payingCompanyId !== emp.primaryCompanyId) {
          const payingReport = reportMap.get(a.payingCompanyId);
          if (payingReport) {
            payingReport.intercompany.push({ employeeId: emp.id, amount: a.amount });
            payingReport.totalIntercompanyNet += a.amount;
          }
        }
      }
    }

    const co1Report = reportMap.get("co-1");
    expect(co1Report.internal.length).toBe(1);
    expect(co1Report.totalInternalNet).toBe(17500);
    expect(co1Report.intercompany.length).toBe(1);
    expect(co1Report.totalIntercompanyNet).toBe(5000);

    const co2Report = reportMap.get("co-2");
    expect(co2Report.internal.length).toBe(1);
    expect(co2Report.totalInternalNet).toBe(21500);
    expect(co2Report.intercompany.length).toBe(0);
  });
});
