import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session || session.user.platformRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const selectedRunId = searchParams.get("runId");

  // 1. Fetch all APPROVED or POSTED payroll runs for the dropdown filter
  const approvedRuns = await prisma.payrollRun.findMany({
    where: {
      status: { in: ["APPROVED", "POSTED"] },
    },
    include: {
      company: { select: { id: true, legalName: true, companyCode: true } },
      payrollPeriod: { select: { id: true, cutoffStart: true, cutoffEnd: true, payDate: true, periodType: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const runOptions = approvedRuns.map((r) => ({
    runId: r.id,
    companyId: r.companyId,
    companyName: r.company.legalName,
    companyCode: r.company.companyCode,
    runNumber: r.runNumber,
    status: r.status,
    periodStart: r.payrollPeriod.cutoffStart.toISOString(),
    periodEnd: r.payrollPeriod.cutoffEnd.toISOString(),
    payDate: r.payrollPeriod.payDate.toISOString(),
    label: `Run #${r.runNumber} · ${r.company.legalName} (${r.payrollPeriod.cutoffStart.toISOString().slice(0, 10)} to ${r.payrollPeriod.cutoffEnd.toISOString().slice(0, 10)}) [${r.status}]`,
  }));

  // Filter runs to compute report data
  const targetRunIds = selectedRunId && selectedRunId !== "ALL"
    ? [selectedRunId]
    : approvedRuns.map((r) => r.id);

  // 2. Fetch all companies in the group
  const companies = await prisma.company.findMany({
    orderBy: { legalName: "asc" },
    select: { id: true, legalName: true, tradeName: true, companyCode: true, tin: true },
  });

  // If no target runs exist, return empty report breakdown with dropdown options
  if (targetRunIds.length === 0) {
    return NextResponse.json({
      runOptions,
      selectedRunId: selectedRunId || "ALL",
      reportData: companies.map((c) => ({
        companyId: c.id,
        companyName: c.legalName,
        companyCode: c.companyCode,
        internalPayouts: [],
        intercompanyPayouts: [],
        totalInternalNet: 0,
        totalIntercompanyNet: 0,
        grandTotalNet: 0,
      })),
      groupTotals: { totalInternalNet: 0, totalIntercompanyNet: 0, grandTotalNet: 0 },
    });
  }

  // 3. Fetch payslips for target approved/posted runs
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

  // 4. Build per-company report breakdown
  const companyReportMap = new Map<string, {
    companyId: string;
    companyName: string;
    companyCode: string;
    internalPayouts: Array<{
      employeeId: string;
      employeeNumber: string;
      employeeName: string;
      positionTitle: string;
      grossPay: number;
      statutoryDeductions: number;
      otherDeductions: number;
      netPay: number;
      runLabel: string;
    }>;
    intercompanyPayouts: Array<{
      employeeId: string;
      employeeNumber: string;
      employeeName: string;
      primaryCompany: string;
      itemLabel: string;
      grossAmount: number;
      netPay: number;
      runLabel: string;
    }>;
    totalInternalNet: number;
    totalIntercompanyNet: number;
    grandTotalNet: number;
  }>();

  for (const c of companies) {
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

  for (const payslip of payslips) {
    const primaryCompanyId = payslip.employee.companyId;
    const runLabel = `Run #${payslip.payrollRun.runNumber} (${payslip.payrollRun.company.companyCode})`;

    const gross = Number(payslip.grossPay);
    const statDeductions = Number(payslip.totalStatutoryDeductions);
    const otherDeductions = Number(payslip.totalOtherDeductions);
    const net = Number(payslip.netPay);

    // Internal Payout: Employee's primary company matches the payslip company
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

    // Intercompany Payouts: Check for allowance line items funded by a different company
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
              netPay: allowanceAmount, // Cross-funded allowance payout
              runLabel,
            });
            payingCoReport.totalIntercompanyNet += allowanceAmount;
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

  return NextResponse.json({
    runOptions,
    selectedRunId: selectedRunId || "ALL",
    reportData,
    groupTotals: {
      totalInternalNet: Math.round(totalGroupInternalNet * 100) / 100,
      totalIntercompanyNet: Math.round(totalGroupIntercompanyNet * 100) / 100,
      grandTotalNet: Math.round((totalGroupInternalNet + totalGroupIntercompanyNet) * 100) / 100,
    },
  });
}
