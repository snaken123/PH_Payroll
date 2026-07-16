import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantRole, withCompanyScope } from "@/lib/db/scoped";
import { generateDefaultEntriesSchema } from "@/lib/validations/attendance";
import { CompanyRole } from "@/lib/generated/prisma/enums";

const MANAGE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

function toDateOnly(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Bootstraps a cutoff with default entries so HR only has to edit the
 * exceptions (absences, OT, holiday work) instead of typing every day —
 * Sundays default to REST_DAY, dates matching a CompanyHoliday default to
 * HOLIDAY (unworked), everything else defaults to a full PRESENT day. Never
 * overwrites a day that already has an entry.
 */
export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = generateDefaultEntriesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { employeeId, start, end } = parsed.data;

  const employee = await prisma.employee.findFirst({
    where: withCompanyScope(ctx.companyId, { id: employeeId }),
  });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const startDate = toDateOnly(new Date(start));
  const endDate = toDateOnly(new Date(end));

  const [existing, holidays] = await Promise.all([
    prisma.timesheetEntry.findMany({
      where: { employeeId, workDate: { gte: startDate, lte: endDate } },
      select: { workDate: true },
    }),
    prisma.companyHoliday.findMany({
      where: withCompanyScope(ctx.companyId, { date: { gte: startDate, lte: endDate } }),
    }),
  ]);

  const existingDates = new Set(existing.map((e) => e.workDate.toISOString().slice(0, 10)));
  const holidayByDate = new Map(holidays.map((h) => [h.date.toISOString().slice(0, 10), h]));

  const toCreate: {
    companyId: string;
    employeeId: string;
    workDate: Date;
    status: "PRESENT" | "REST_DAY" | "HOLIDAY";
    scheduledHours: number;
    regularHours: number;
    holidayType?: "REGULAR_HOLIDAY" | "SPECIAL_NON_WORKING";
    isRestDay: boolean;
  }[] = [];

  for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateKey = d.toISOString().slice(0, 10);
    if (existingDates.has(dateKey)) continue;

    const isSunday = d.getUTCDay() === 0;
    const holiday = holidayByDate.get(dateKey);

    if (isSunday) {
      toCreate.push({
        companyId: ctx.companyId,
        employeeId,
        workDate: new Date(d),
        status: "REST_DAY",
        scheduledHours: 0,
        regularHours: 0,
        isRestDay: true,
      });
    } else if (holiday) {
      toCreate.push({
        companyId: ctx.companyId,
        employeeId,
        workDate: new Date(d),
        status: "HOLIDAY",
        scheduledHours: 8,
        regularHours: 0,
        holidayType: holiday.holidayType,
        isRestDay: false,
      });
    } else {
      toCreate.push({
        companyId: ctx.companyId,
        employeeId,
        workDate: new Date(d),
        status: "PRESENT",
        scheduledHours: 8,
        regularHours: 8,
        isRestDay: false,
      });
    }
  }

  if (toCreate.length > 0) {
    await prisma.timesheetEntry.createMany({ data: toCreate });
  }

  return NextResponse.json({ created: toCreate.length });
}
