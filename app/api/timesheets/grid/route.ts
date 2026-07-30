import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantRole, withCompanyScope } from "@/lib/db/scoped";
import { CompanyRole, EmploymentStatus } from "@/lib/generated/prisma/enums";

const MANAGE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

// Backs the attendance spreadsheet view — every active employee plus every
// timesheet entry and company holiday in the date range, in one request.
// The client fills in a sensible default row (mirroring
// lib/services/attendanceDefaults.ts) for any employee/date pair that has no
// entry yet, so the grid is immediately editable without a separate
// "generate defaults" step first.
export async function GET(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  if (!start || !end) {
    return NextResponse.json({ error: "start and end are required" }, { status: 400 });
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  const [employees, timesheets, holidays] = await Promise.all([
    prisma.employee.findMany({
      where: withCompanyScope(ctx.companyId, {
        employmentStatus: { in: [EmploymentStatus.PROBATIONARY, EmploymentStatus.REGULAR] },
      }),
      select: { id: true, employeeNumber: true, firstName: true, lastName: true },
      orderBy: { employeeNumber: "asc" },
    }),
    prisma.timesheetEntry.findMany({
      where: {
        companyId: ctx.companyId,
        workDate: { gte: startDate, lte: endDate },
      },
    }),
    prisma.companyHoliday.findMany({
      where: withCompanyScope(ctx.companyId, { date: { gte: startDate, lte: endDate } }),
    }),
  ]);

  return NextResponse.json({ employees, timesheets, holidays });
}
