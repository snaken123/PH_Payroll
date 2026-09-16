import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole, PayrollRunStatus } from "@/lib/generated/prisma/enums";

const VIEW_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

export async function GET() {
  let ctx;
  try {
    ctx = await requireTenantRole(VIEW_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const approvedRuns = await prisma.payrollRun.findMany({
    where: {
      companyId: ctx.companyId,
      status: { in: [PayrollRunStatus.APPROVED, PayrollRunStatus.POSTED] },
    },
    include: {
      payrollPeriod: true,
      payslips: {
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true,
              personalEmail: true,
              departmentName: true,
              user: { select: { email: true } },
            },
          },
        },
      },
    },
    orderBy: { runNumber: "desc" },
  });

  const runs = approvedRuns.map((run) => {
    const formattedPayslips = run.payslips.map((p) => {
      const email = p.employee.personalEmail?.trim() || p.employee.user?.email?.trim() || null;
      return {
        id: p.id,
        employeeId: p.employeeId,
        employeeName: `${p.employee.lastName}, ${p.employee.firstName}`,
        employeeNumber: p.employee.employeeNumber,
        departmentName: p.employee.departmentName || "General",
        email,
        hasEmail: Boolean(email),
        netPay: p.netPay.toString(),
        grossPay: p.grossPay.toString(),
      };
    });

    return {
      id: run.id,
      runNumber: run.runNumber,
      status: run.status,
      periodStart: run.payrollPeriod.cutoffStart.toISOString().slice(0, 10),
      periodEnd: run.payrollPeriod.cutoffEnd.toISOString().slice(0, 10),
      payDate: run.payrollPeriod.payDate.toISOString().slice(0, 10),
      payslipCount: run.payslips.length,
      payslipsWithEmailCount: formattedPayslips.filter((p) => p.hasEmail).length,
      payslips: formattedPayslips,
    };
  });

  return NextResponse.json({
    runs,
    hasResendKey: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0),
  });
}
