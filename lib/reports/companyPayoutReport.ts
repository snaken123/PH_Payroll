import { prisma } from "@/lib/db";

export interface CompanyPayoutReportParams {
  selectedRunId?: string | string[];
  companyIds?: string[];
  employeeIds?: string[];
}

export interface InternalPayoutItem {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  positionTitle: string;
  grossPay: number;
  statutoryDeductions: number;
  otherDeductions: number;
  netPay: number;
  runLabel: string;
}

export interface IntercompanyPayoutItem {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  primaryCompany: string;
  itemLabel: string;
  grossAmount: number;
  netPay: number;
  runLabel: string;
}

export interface CompanyReportData {
  companyId: string;
  companyName: string;
  companyCode: string;
  internalPayouts: InternalPayoutItem[];
  intercompanyPayouts: IntercompanyPayoutItem[];
  totalInternalNet: number;
  totalIntercompanyNet: number;
  grandTotalNet: number;
}

export interface CompanyOption {
  id: string;
  legalName: string;
  tradeName: string | null;
  companyCode: string;
}

export interface EmployeeReportOption {
  id: string;
  employeeNumber: string;
  name: string;
  companyId: string;
  companyCode: string;
  companyName: string;
}

export interface RunOptionItem {
  runId: string;
  companyId: string;
  companyName: string;
  companyCode: string;
  runNumber: number;
  status: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  label: string;
}

export interface CompanyPayoutReportResult {
  runOptions: RunOptionItem[];
  companies: CompanyOption[];
  employees: EmployeeReportOption[];
  selectedRunId: string | string[];
  selectedCompanyIds: string[];
  selectedEmployeeIds: string[];
  reportData: CompanyReportData[];
  groupTotals: {
    totalInternalNet: number;
    totalIntercompanyNet: number;
    grandTotalNet: number;
  };
  filterSummary: {
    includedCompanies: string;
    includedEmployees: string;
    payrollRunLabel: string;
    statusFilterLabel: string;
  };
}

export async function generateCompanyPayoutReport(
  params: CompanyPayoutReportParams = {}
): Promise<CompanyPayoutReportResult> {
  const { selectedRunId = "ALL", companyIds, employeeIds } = params;

  // 1. Fetch all draft, pending, approved, or posted payroll runs
  const payrollRuns = await prisma.payrollRun.findMany({
    where: {
      status: { in: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "POSTED"] },
    },
    include: {
      company: { select: { id: true, legalName: true, companyCode: true } },
      payrollPeriod: { select: { id: true, cutoffStart: true, cutoffEnd: true, payDate: true, periodType: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const runOptions: RunOptionItem[] = payrollRuns.map((r) => ({
    runId: r.id,
    companyId: r.companyId,
    companyName: r.company.legalName,
    companyCode: r.company.companyCode,
    runNumber: r.runNumber,
    status: r.status,
    periodStart: r.payrollPeriod.cutoffStart.toISOString(),
    periodEnd: r.payrollPeriod.cutoffEnd.toISOString(),
    payDate: r.payrollPeriod.payDate.toISOString(),
    label: `Run #${r.runNumber} · ${r.company.legalName} (${r.payrollPeriod.cutoffStart.toISOString().slice(0, 10)} to ${r.payrollPeriod.cutoffEnd.toISOString().slice(0, 10)}) [${r.status.replace("_", " ")}]`,
  }));

  // 2. Fetch all group companies
  const allCompanies = await prisma.company.findMany({
    orderBy: { legalName: "asc" },
    select: { id: true, legalName: true, tradeName: true, companyCode: true },
  });

  // Filter companies based on companyIds selection
  let selectedCompanies = allCompanies;
  let filterCompanyIds = allCompanies.map((c) => c.id);

  if (companyIds && companyIds.length > 0 && !companyIds.includes("ALL")) {
    selectedCompanies = allCompanies.filter((c) => companyIds.includes(c.id));
    filterCompanyIds = selectedCompanies.map((c) => c.id);
  }

  // Filter target runs
  let targetRunIds: string[] = [];
  if (!selectedRunId || selectedRunId === "ALL" || (Array.isArray(selectedRunId) && (selectedRunId.length === 0 || selectedRunId.includes("ALL")))) {
    targetRunIds = payrollRuns.map((r) => r.id);
  } else if (Array.isArray(selectedRunId)) {
    targetRunIds = selectedRunId.filter((id) => id !== "ALL");
  } else {
    targetRunIds = selectedRunId.split(",").map((s) => s.trim()).filter((s) => s && s !== "ALL");
  }

  if (targetRunIds.length === 0) {
    targetRunIds = payrollRuns.map((r) => r.id);
  }

  // Initialize per-company map
  const companyReportMap = new Map<string, CompanyReportData>();
  for (const c of selectedCompanies) {
    companyReportMap.set(c.id, {
      companyId: c.id,
      companyName: c.legalName,
      companyCode: c.companyCode,
      internalPayouts: [],
      intercompanyPayouts: [],
      totalInternalNet: 0,
      totalIntercompanyNet: 0,
      grandTotalNet: 0,
    });
  }

  // 3. Fetch all active employees across group companies for options
  const allEmployees = await prisma.employee.findMany({
    where: {
      isDeleted: false,
      companyId: { in: filterCompanyIds },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      companyId: true,
      company: { select: { id: true, legalName: true, companyCode: true } },
    },
  });

  const employeeOptions: EmployeeReportOption[] = allEmployees.map((e) => ({
    id: e.id,
    employeeNumber: e.employeeNumber,
    name: `${e.lastName}, ${e.firstName}`,
    companyId: e.companyId,
    companyCode: e.company.companyCode,
    companyName: e.company.legalName,
  }));

  const allEmployeeIds = allEmployees.map((e) => e.id);
  const isEmployeeFiltered = employeeIds && employeeIds.length > 0 && !employeeIds.includes("ALL");
  const filterEmployeeIds = isEmployeeFiltered
    ? allEmployeeIds.filter((id) => employeeIds.includes(id))
    : allEmployeeIds;

  const isEmployeeIncluded = (empId: string) => {
    if (!isEmployeeFiltered) return true;
    return filterEmployeeIds.includes(empId);
  };

  // 4. If target runs exist, query payslips
  if (targetRunIds.length > 0) {
    const payslips = await prisma.payslip.findMany({
      where: {
        payrollRunId: { in: targetRunIds },
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            positionTitle: true,
            companyId: true,
            company: { select: { id: true, legalName: true, companyCode: true } },
            compensationRecords: {
              where: { effectiveTo: null },
              take: 1,
              include: {
                allowances: {
                  include: { payingCompany: { select: { id: true, legalName: true, companyCode: true } } },
                },
              },
            },
          },
        },
        payrollRun: {
          include: {
            company: { select: { id: true, legalName: true, companyCode: true } },
            payrollPeriod: true,
          },
        },
        lineItems: true,
      },
    });

    for (const payslip of payslips) {
      if (!isEmployeeIncluded(payslip.employee.id)) {
        continue;
      }

      const primaryCompanyId = payslip.employee.companyId;
      const runLabel = `Run #${payslip.payrollRun.runNumber} (${payslip.payrollRun.company.companyCode}) [${payslip.payrollRun.status.replace("_", " ")}]`;

      const gross = Number(payslip.grossPay);
      const statDeductions = Number(payslip.totalStatutoryDeductions);
      const otherDeductions = Number(payslip.totalOtherDeductions);
      const net = Number(payslip.netPay);

      // Internal Payout
      const primaryCompanyReport = companyReportMap.get(primaryCompanyId);
      if (primaryCompanyReport) {
        primaryCompanyReport.internalPayouts.push({
          employeeId: payslip.employee.id,
          employeeNumber: payslip.employee.employeeNumber,
          employeeName: `${payslip.employee.lastName}, ${payslip.employee.firstName}`,
          positionTitle: payslip.employee.positionTitle,
          grossPay: gross,
          statutoryDeductions: statDeductions,
          otherDeductions: otherDeductions,
          netPay: net,
          runLabel,
        });
        primaryCompanyReport.totalInternalNet += net;
      }

      // Intercompany Payouts
      const currentComp = payslip.employee.compensationRecords[0];
      if (currentComp && currentComp.allowances) {
        for (const allowance of currentComp.allowances) {
          if (allowance.payingCompanyId && allowance.payingCompanyId !== primaryCompanyId) {
            const payingCoReport = companyReportMap.get(allowance.payingCompanyId);
            if (payingCoReport) {
              const allowanceAmount = Number(allowance.amount);
              payingCoReport.intercompanyPayouts.push({
                employeeId: payslip.employee.id,
                employeeNumber: payslip.employee.employeeNumber,
                employeeName: `${payslip.employee.lastName}, ${payslip.employee.firstName}`,
                primaryCompany: payslip.employee.company.legalName,
                itemLabel: allowance.label,
                grossAmount: allowanceAmount,
                netPay: allowanceAmount,
                runLabel,
              });
              payingCoReport.totalIntercompanyNet += allowanceAmount;
            }
          }
        }
      }
    }
  }

  let totalGroupInternalNet = 0;
  let totalGroupIntercompanyNet = 0;

  const reportData = Array.from(companyReportMap.values()).map((cr) => {
    cr.totalInternalNet = Math.round(cr.totalInternalNet * 100) / 100;
    cr.totalIntercompanyNet = Math.round(cr.totalIntercompanyNet * 100) / 100;
    cr.grandTotalNet = Math.round((cr.totalInternalNet + cr.totalIntercompanyNet) * 100) / 100;

    totalGroupInternalNet += cr.totalInternalNet;
    totalGroupIntercompanyNet += cr.totalIntercompanyNet;

    return cr;
  });

  let payrollRunLabel = "All Runs (Drafts, Pending, Approved & Posted)";
  if (targetRunIds.length === 1) {
    const singleRun = runOptions.find((r) => r.runId === targetRunIds[0]);
    if (singleRun) {
      payrollRunLabel = singleRun.label;
    }
  } else if (targetRunIds.length < payrollRuns.length) {
    payrollRunLabel = `${targetRunIds.length} Selected Payroll Runs`;
  }

  const includedCompaniesLabel = selectedCompanies.length === allCompanies.length
    ? `All ${allCompanies.length} Group Companies`
    : `${selectedCompanies.map((c) => c.companyCode).join(", ")} (${selectedCompanies.length} of ${allCompanies.length} selected)`;

  const includedEmployeesLabel = !isEmployeeFiltered || filterEmployeeIds.length === allEmployeeIds.length
    ? `All ${allEmployeeIds.length} Employees`
    : `${filterEmployeeIds.length} of ${allEmployeeIds.length} Employees Selected`;

  return {
    runOptions,
    companies: allCompanies,
    employees: employeeOptions,
    selectedRunId,
    selectedCompanyIds: filterCompanyIds,
    selectedEmployeeIds: filterEmployeeIds,
    reportData,
    groupTotals: {
      totalInternalNet: Math.round(totalGroupInternalNet * 100) / 100,
      totalIntercompanyNet: Math.round(totalGroupIntercompanyNet * 100) / 100,
      grandTotalNet: Math.round((totalGroupInternalNet + totalGroupIntercompanyNet) * 100) / 100,
    },
    filterSummary: {
      includedCompanies: includedCompaniesLabel,
      includedEmployees: includedEmployeesLabel,
      payrollRunLabel,
      statusFilterLabel: "Drafts, Pending Approval, Approved & Posted",
    },
  };
}
