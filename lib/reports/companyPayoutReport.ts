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

export interface ConsolidatedEmployeePayout {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  companyName: string;
  bankName: string;
  bankAccountNumber: string;
  netAmount: number;
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
  consolidatedEmployees: ConsolidatedEmployeePayout[];
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

  // Expand target run IDs to include runs from other group companies covering the same cutoff periods
  const selectedRuns = payrollRuns.filter((r) => targetRunIds.includes(r.id));
  const cutoffTimeRanges = selectedRuns.map((r) => ({
    start: r.payrollPeriod.cutoffStart.getTime(),
    end: r.payrollPeriod.cutoffEnd.getTime(),
  }));

  const matchingPeriodRunIds = payrollRuns
    .filter((r) =>
      cutoffTimeRanges.some(
        (cr) =>
          r.payrollPeriod.cutoffStart.getTime() === cr.start &&
          r.payrollPeriod.cutoffEnd.getTime() === cr.end
      )
    )
    .map((r) => r.id);

  const queryRunIds = Array.from(new Set([...targetRunIds, ...matchingPeriodRunIds]));

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

  const consolidatedEmployeeMap = new Map<string, ConsolidatedEmployeePayout>();

  // 3. Fetch all active employees across group companies for options
  const allEmployees = await prisma.employee.findMany({
    where: {
      isDeleted: false,
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

  const isEmployeeFiltered = employeeIds && employeeIds.length > 0 && !employeeIds.includes("ALL");
  const isEmployeeIncluded = (empId: string) => {
    if (!isEmployeeFiltered) return true;
    return employeeIds.includes(empId);
  };

  const explicitTargetRunIds = new Set(targetRunIds);

  // 4. If query runs exist, query payslips
  if (queryRunIds.length > 0) {
    const payslips = await prisma.payslip.findMany({
      where: {
        payrollRunId: { in: queryRunIds },
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            positionTitle: true,
            bankName: true,
            bankAccountNumber: true,
            paymentMethod: true,
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

      const isExplicitlySelectedRun = explicitTargetRunIds.has(payslip.payrollRunId);
      const primaryCompanyId = payslip.employee.companyId;
      const runLabel = `Run #${payslip.payrollRun.runNumber} (${payslip.payrollRun.company.companyCode}) [${payslip.payrollRun.status.replace("_", " ")}]`;

      const gross = Number(payslip.grossPay);
      const statDeductions = Number(payslip.totalStatutoryDeductions);
      const otherDeductions = Number(payslip.totalOtherDeductions);
      const net = Number(payslip.netPay);

      let totalExternalIntercompanyAllowances = 0;
      const intercompanyItems: Array<{ payingCompanyId: string; label: string; amount: number }> = [];

      // Inspect allowance line items on payslip directly
      const allowanceLineItems = payslip.lineItems.filter((li) => li.category === "ALLOWANCE");
      const currentComp = payslip.employee.compensationRecords[0];

      if (allowanceLineItems.length > 0) {
        const usedLineItemIds = new Set<string>();

        // First pass: match line items that explicitly store payingCompanyId in sourceRef
        for (const li of allowanceLineItems) {
          const payingCoId = (li.sourceRef as { payingCompanyId?: string | null } | null)?.payingCompanyId;
          if (payingCoId && payingCoId !== primaryCompanyId) {
            usedLineItemIds.add(li.id);
            const allowanceAmount = Number(li.amount);
            totalExternalIntercompanyAllowances += allowanceAmount;
            intercompanyItems.push({
              payingCompanyId: payingCoId,
              label: li.description,
              amount: allowanceAmount,
            });
          }
        }

        // Second pass: for older payslips without sourceRef.payingCompanyId, match using currentComp.allowances
        if (currentComp && currentComp.allowances) {
          for (const allowance of currentComp.allowances) {
            if (allowance.payingCompanyId && allowance.payingCompanyId !== primaryCompanyId) {
              const lineItemMatch = allowanceLineItems.find(
                (li) =>
                  !usedLineItemIds.has(li.id) &&
                  li.description.toLowerCase().trim() === allowance.label.toLowerCase().trim()
              );

              if (lineItemMatch) {
                usedLineItemIds.add(lineItemMatch.id);
                const allowanceAmount = Number(lineItemMatch.amount);
                totalExternalIntercompanyAllowances += allowanceAmount;
                intercompanyItems.push({
                  payingCompanyId: allowance.payingCompanyId,
                  label: allowance.label,
                  amount: allowanceAmount,
                });
              } else if (usedLineItemIds.size === 0) {
                const allowanceAmount = Number(allowance.amount);
                totalExternalIntercompanyAllowances += allowanceAmount;
                intercompanyItems.push({
                  payingCompanyId: allowance.payingCompanyId,
                  label: allowance.label,
                  amount: allowanceAmount,
                });
              }
            }
          }
        }
      }

      // Net and Gross for the primary company (excluding external intercompany allowances funded by other companies)
      const primaryGross = Math.round(Math.max(0, gross - totalExternalIntercompanyAllowances) * 100) / 100;
      const primaryNet = Math.round((net - totalExternalIntercompanyAllowances) * 100) / 100;

      const bankNameVal = payslip.employee.paymentMethod === "CASH" ? "CASH" : (payslip.employee.bankName || "N/A");
      const bankAccountVal = payslip.employee.paymentMethod === "CASH" ? "N/A" : (payslip.employee.bankAccountNumber || "N/A");

      // Internal Payout for Primary Employer — ONLY if this run was explicitly selected
      if (isExplicitlySelectedRun) {
        const primaryCompanyReport = companyReportMap.get(primaryCompanyId);
        if (primaryCompanyReport) {
          primaryCompanyReport.internalPayouts.push({
            employeeId: payslip.employee.id,
            employeeNumber: payslip.employee.employeeNumber,
            employeeName: `${payslip.employee.lastName}, ${payslip.employee.firstName}`,
            positionTitle: payslip.employee.positionTitle,
            grossPay: primaryGross,
            statutoryDeductions: statDeductions,
            otherDeductions: otherDeductions,
            netPay: primaryNet,
            runLabel,
          });
          primaryCompanyReport.totalInternalNet += primaryNet;

          if (!consolidatedEmployeeMap.has(payslip.employee.id)) {
            consolidatedEmployeeMap.set(payslip.employee.id, {
              employeeId: payslip.employee.id,
              employeeNumber: payslip.employee.employeeNumber,
              employeeName: `${payslip.employee.lastName}, ${payslip.employee.firstName}`,
              companyName: payslip.employee.company.legalName,
              bankName: bankNameVal,
              bankAccountNumber: bankAccountVal,
              netAmount: 0,
            });
          }
          consolidatedEmployeeMap.get(payslip.employee.id)!.netAmount += primaryNet;
        }
      }

      // Intercompany Payouts for Funding Companies
      for (const item of intercompanyItems) {
        const payingCoReport = companyReportMap.get(item.payingCompanyId);
        if (payingCoReport) {
          payingCoReport.intercompanyPayouts.push({
            employeeId: payslip.employee.id,
            employeeNumber: payslip.employee.employeeNumber,
            employeeName: `${payslip.employee.lastName}, ${payslip.employee.firstName}`,
            primaryCompany: payslip.employee.company.legalName,
            itemLabel: item.label,
            grossAmount: item.amount,
            netPay: item.amount,
            runLabel,
          });
          payingCoReport.totalIntercompanyNet += item.amount;

          if (!consolidatedEmployeeMap.has(payslip.employee.id)) {
            consolidatedEmployeeMap.set(payslip.employee.id, {
              employeeId: payslip.employee.id,
              employeeNumber: payslip.employee.employeeNumber,
              employeeName: `${payslip.employee.lastName}, ${payslip.employee.firstName}`,
              companyName: payslip.employee.company.legalName,
              bankName: bankNameVal,
              bankAccountNumber: bankAccountVal,
              netAmount: 0,
            });
          }
          consolidatedEmployeeMap.get(payslip.employee.id)!.netAmount += item.amount;
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

  const consolidatedEmployees = Array.from(consolidatedEmployeeMap.values())
    .map((e) => ({
      ...e,
      netAmount: Math.round(e.netAmount * 100) / 100,
    }))
    .filter((e) => e.netAmount > 0)
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName));

  let payrollRunLabel = "All Runs (Drafts, Pending, Approved & Posted)";
  if (targetRunIds.length === 1) {
    const singleRun = runOptions.find((r) => r.runId === targetRunIds[0]);
    if (singleRun) {
      payrollRunLabel = singleRun.label;
    }
  } else if (targetRunIds.length < payrollRuns.length) {
    payrollRunLabel = `${targetRunIds.length} Selected Payroll Runs`;
  }

  const allEmployeeIds = allEmployees.map((e) => e.id);
  const filterEmployeeIds = isEmployeeFiltered ? employeeIds : allEmployeeIds;

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
    consolidatedEmployees,
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
