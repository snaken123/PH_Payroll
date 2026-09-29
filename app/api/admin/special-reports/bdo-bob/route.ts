import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session || session.user.platformRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("runId");

  // Fetch all POSTED payroll runs
  const postedRuns = await prisma.payrollRun.findMany({
    where: { status: "POSTED" },
    include: {
      company: { select: { id: true, legalName: true, companyCode: true } },
      payrollPeriod: true,
      _count: { select: { payslips: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!runId) {
    return NextResponse.json({
      postedRuns: postedRuns.map((r) => ({
        id: r.id,
        runNumber: r.runNumber,
        companyId: r.companyId,
        companyName: r.company.legalName,
        companyCode: r.company.companyCode,
        cutoffStart: r.payrollPeriod.cutoffStart.toISOString().slice(0, 10),
        cutoffEnd: r.payrollPeriod.cutoffEnd.toISOString().slice(0, 10),
        payDate: new Date(r.payrollPeriod.payDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        employeeCount: r._count.payslips,
        label: `Run #${r.runNumber} — ${r.company.legalName} (${r.payrollPeriod.cutoffStart.toISOString().slice(0, 10)} to ${r.payrollPeriod.cutoffEnd.toISOString().slice(0, 10)})`,
      })),
    });
  }

  // Fetch details for specific runId
  const run = await prisma.payrollRun.findUnique({
    where: { id: runId },
    include: {
      company: { select: { id: true, legalName: true, companyCode: true } },
      payrollPeriod: true,
      payslips: {
        include: {
          employee: {
            select: {
              id: true,
              employeeNumber: true,
              firstName: true,
              lastName: true,
              middleName: true,
              companyId: true,
              bankName: true,
              bankAccountNumber: true,
              company: { select: { id: true, legalName: true, companyCode: true } },
            },
          },
        },
      },
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });
  }

  // Find unique companies involved in this run's payslips
  const companyMap = new Map<string, { id: string; legalName: string; companyCode: string }>();
  companyMap.set(run.company.id, run.company);

  for (const ps of run.payslips) {
    if (ps.employee.company) {
      companyMap.set(ps.employee.company.id, ps.employee.company);
    }
  }

  const companies = Array.from(companyMap.values());

  const employeePayslips = run.payslips.map((ps) => {
    const emp = ps.employee;
    const middle = emp.middleName?.trim() ? ` ${emp.middleName.trim()} ` : " ";
    const formattedName = `${emp.firstName.trim()}${middle}${emp.lastName.trim()}`.toUpperCase();

    return {
      payslipId: ps.id,
      employeeId: emp.id,
      employeeNumber: emp.employeeNumber,
      firstName: emp.firstName,
      lastName: emp.lastName,
      middleName: emp.middleName,
      formattedName,
      companyId: emp.companyId,
      companyName: emp.company?.legalName || run.company.legalName,
      companyCode: emp.company?.companyCode || run.company.companyCode,
      bankName: emp.bankName || "BDO",
      bankAccountNumber: emp.bankAccountNumber || "",
      netPay: Number(ps.netPay),
    };
  });

  return NextResponse.json({
    runDetails: {
      id: run.id,
      runNumber: run.runNumber,
      companyId: run.companyId,
      companyName: run.company.legalName,
      companyCode: run.company.companyCode,
      cutoffStart: run.payrollPeriod.cutoffStart.toISOString().slice(0, 10),
      cutoffEnd: run.payrollPeriod.cutoffEnd.toISOString().slice(0, 10),
      payDate: new Date(run.payrollPeriod.payDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    },
    companies,
    employees: employeePayslips,
  });
}
