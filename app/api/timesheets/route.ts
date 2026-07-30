import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantRole, withCompanyScope } from "@/lib/db/scoped";
import { upsertTimesheetSchema, combineDateAndTime } from "@/lib/validations/attendance";
import { CompanyRole } from "@/lib/generated/prisma/enums";

const MANAGE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

export async function GET(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const employeeId = url.searchParams.get("employeeId");
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  if (!employeeId || !start || !end) {
    return NextResponse.json({ error: "employeeId, start, and end are required" }, { status: 400 });
  }

  const employee = await prisma.employee.findFirst({
    where: withCompanyScope(ctx.companyId, { id: employeeId }),
  });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const timesheets = await prisma.timesheetEntry.findMany({
    where: { employeeId, workDate: { gte: new Date(start), lte: new Date(end) } },
    orderBy: { workDate: "asc" },
  });

  return NextResponse.json({ timesheets });
}

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = upsertTimesheetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const employee = await prisma.employee.findFirst({
    where: withCompanyScope(ctx.companyId, { id: data.employeeId }),
  });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const workDate = new Date(data.workDate);
  const timeIn = combineDateAndTime(data.workDate, data.timeIn);
  const timeOut = combineDateAndTime(data.workDate, data.timeOut);

  const timesheet = await prisma.timesheetEntry.upsert({
    where: { employeeId_workDate: { employeeId: data.employeeId, workDate } },
    update: {
      status: data.status,
      timeIn,
      timeOut,
      scheduledHours: data.scheduledHours,
      lateMinutes: data.lateMinutes,
      undertimeMinutes: data.undertimeMinutes,
      regularHours: data.regularHours,
      overtimeHours: data.overtimeHours,
      nightDiffHours: data.nightDiffHours,
      holidayType: data.holidayType || null,
      isRestDay: data.isRestDay,
      source: "MANUAL",
    },
    create: {
      companyId: ctx.companyId,
      employeeId: data.employeeId,
      workDate,
      status: data.status,
      timeIn,
      timeOut,
      scheduledHours: data.scheduledHours,
      lateMinutes: data.lateMinutes,
      undertimeMinutes: data.undertimeMinutes,
      regularHours: data.regularHours,
      overtimeHours: data.overtimeHours,
      nightDiffHours: data.nightDiffHours,
      holidayType: data.holidayType || null,
      isRestDay: data.isRestDay,
      source: "MANUAL",
    },
  });

  return NextResponse.json({ timesheet }, { status: 201 });
}
