import { prisma } from "@/lib/db";

export interface CompanyPayoutReportParams {
  selectedRunId?: string;
  companyIds?: string[];
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
  selectedRunId: string;
  selectedCompanyIds: string[];
  reportData: CompanyReportData[];
  groupTotals: {
    totalInternalNet: number;
    totalIntercompanyNet: number;
    grandTotalNet: number;
  };
  filterSummary: {
    includedCompanies: string;
    payrollRunLabel: string;
    statusFilterLabel: string;
  };
}

export async function generateCompanyPayoutReport(
  params: CompanyPayoutReportParams = {}
): Promise<CompanyPayoutReportResult> {
  const { selectedRunId = "ALL", companyIds } = params;

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
  const targetRunIds = selectedRunId && selectedRunId !== "ALL"
    ? [selectedRunId]
    : payrollRuns.map((r) => r.id);

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

  // 3. If target runs exist, query payslips
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

  const selectedRunOption = runOptions.find((r) => r.runId === selectedRunId);
  const payrollRunLabel = selectedRunId === "ALL" || !selectedRunOption
    ? "All Runs (Drafts, Pending, Approved & Posted)"
    : selectedRunOption.label;

  const includedCompaniesLabel = selectedCompanies.length === allCompanies.length
    ? `All ${allCompanies.length} Group Companies`
    : `${selectedCompanies.map((c) => c.companyCode).join(", ")} (${selectedCompanies.length} of ${allCompanies.length} selected)`;

  return {
    runOptions,
    companies: allCompanies,
    selectedRunId,
    selectedCompanyIds: filterCompanyIds,
    reportData,
    groupTotals: {
      totalInternalNet: Math.round(totalGroupInternalNet * 100) / 100,
      totalIntercompanyNet: Math.round(totalGroupIntercompanyNet * 100) / 100,
      grandTotalNet: Math.round((totalGroupInternalNet + totalGroupIntercompanyNet) * 100) / 100,
    },
    filterSummary: {
      includedCompanies: includedCompaniesLabel,
      payrollRunLabel,
      statusFilterLabel: "Drafts, Pending Approval, Approved & Posted",
    },
  };
}
