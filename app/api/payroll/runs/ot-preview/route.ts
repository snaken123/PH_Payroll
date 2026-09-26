import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole, EmploymentStatus } from "@/lib/generated/prisma/enums";

const RUN_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

export async function GET(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(RUN_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const cutoffStartStr = searchParams.get("cutoffStart");
  const cutoffEndStr = searchParams.get("cutoffEnd");

  if (!cutoffStartStr || !cutoffEndStr) {
    return NextResponse.json(
      { error: "cutoffStart and cutoffEnd query parameters are required" },
      { status: 400 }
    );
  }

  const cutoffStart = new Date(cutoffStartStr);
  const cutoffEnd = new Date(cutoffEndStr);

  if (isNaN(cutoffStart.getTime()) || isNaN(cutoffEnd.getTime())) {
    return NextResponse.json({ error: "Invalid date parameters" }, { status: 400 });
  }

  const employees = await prisma.employee.findMany({
    where: {
      companyId: ctx.companyId,
      isDeleted: false,
      isManagerialExempt: false,
      employmentStatus: { in: [EmploymentStatus.PROBATIONARY, EmploymentStatus.REGULAR, EmploymentStatus.RETAINER] },
    },
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      positionTitle: true,
      timesheetEntries: {
        where: {
          workDate: { gte: cutoffStart, lte: cutoffEnd },
        },
        select: {
          overtimeHours: true,
          lateMinutes: true,
          undertimeMinutes: true,
        },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const employeesWithOt = employees
    .map((emp) => {
      const totalOtHours = emp.timesheetEntries.reduce(
        (sum, t) => sum + Number(t.overtimeHours || 0),
        0
      );
      return {
        employeeId: emp.id,
        employeeNumber: emp.employeeNumber,
        employeeName: `${emp.lastName}, ${emp.firstName}`,
        positionTitle: emp.positionTitle ?? "",
        totalOtHours: Math.round(totalOtHours * 100) / 100,
      };
    })
    .filter((emp) => emp.totalOtHours > 0);

  const employeesWithUndertime = employees
    .map((emp) => {
      const totalUndertimeMinutes = emp.timesheetEntries.reduce(
        (sum, t) => sum + (t.lateMinutes || 0) + (t.undertimeMinutes || 0),
        0
      );
      return {
        employeeId: emp.id,
        employeeNumber: emp.employeeNumber,
        employeeName: `${emp.lastName}, ${emp.firstName}`,
        positionTitle: emp.positionTitle ?? "",
        totalUndertimeMinutes,
        totalUndertimeHours: Math.round((totalUndertimeMinutes / 60) * 100) / 100,
      };
    })
    .filter((emp) => emp.totalUndertimeMinutes > 0);

  return NextResponse.json({ employeesWithOt, employeesWithUndertime });
}
