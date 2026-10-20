import { prisma } from "@/lib/db";
import { withCompanyScope } from "@/lib/db/scoped";
import type { HolidayType } from "@/lib/generated/prisma/enums";

export function toDateOnly(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

interface DefaultEntryInput {
  companyId: string;
  employeeId: string;
  workDate: Date;
  status: "PRESENT" | "REST_DAY" | "HOLIDAY";
  scheduledHours: number;
  regularHours: number;
  holidayType?: HolidayType;
  isRestDay: boolean;
}

/**
 * Computes the default entries for one employee over a date range —
 * Sundays default to REST_DAY, dates matching a CompanyHoliday default to
 * HOLIDAY (unworked), everything else defaults to a full PRESENT day. Never
 * overwrites a day that already has an entry. Shared between the
 * single-employee bulk-generate route and the company-wide one so the
 * defaulting rules can't drift between them.
 */
export async function computeDefaultEntries(
  companyId: string,
  employeeId: string,
  startDate: Date,
  endDate: Date
): Promise<DefaultEntryInput[]> {
  const [employee, existing, holidays, company] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: employeeId },
      select: { dateSeparated: true },
    }),
    prisma.timesheetEntry.findMany({
      where: { employeeId, workDate: { gte: startDate, lte: endDate } },
      select: { workDate: true },
    }),
    prisma.companyHoliday.findMany({
      where: withCompanyScope(companyId, { date: { gte: startDate, lte: endDate } }),
    }),
    prisma.company.findUnique({
      where: { id: companyId },
      select: {
        attendanceSaturdayRuleEnabled: true,
        attendanceSaturdayShiftHours: true,
        attendanceSaturdayEmployeeIds: true,
      },
    }),
  ]);

  const existingDates = new Set(existing.map((e) => e.workDate.toISOString().slice(0, 10)));
  const holidayByDate = new Map(holidays.map((h) => [h.date.toISOString().slice(0, 10), h]));

  const satRuleEnabled = company?.attendanceSaturdayRuleEnabled ?? false;
  const satEmpIds = Array.isArray(company?.attendanceSaturdayEmployeeIds)
    ? (company?.attendanceSaturdayEmployeeIds as string[])
    : null;
  const appliesToThisEmp = !satEmpIds || satEmpIds.length === 0 || satEmpIds.includes(employeeId);
  const saturdayShiftHours = company?.attendanceSaturdayShiftHours ?? 5;

  const toCreate: DefaultEntryInput[] = [];

  const effectiveEndDate =
    employee?.dateSeparated && employee.dateSeparated < endDate
      ? toDateOnly(employee.dateSeparated)
      : endDate;

  for (let d = new Date(startDate); d <= effectiveEndDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateKey = d.toISOString().slice(0, 10);
    if (existingDates.has(dateKey)) continue;

    const isSunday = d.getUTCDay() === 0;
    const isSaturday = d.getUTCDay() === 6;
    const holiday = holidayByDate.get(dateKey);
    const isSatRuleActive = isSaturday && satRuleEnabled && appliesToThisEmp;
    const dayShiftHours = isSatRuleActive ? saturdayShiftHours : 8;

    if (isSunday) {
      toCreate.push({
        companyId,
        employeeId,
        workDate: new Date(d),
        status: "REST_DAY",
        scheduledHours: 0,
        regularHours: 0,
        isRestDay: true,
      });
    } else if (holiday) {
      toCreate.push({
        companyId,
        employeeId,
        workDate: new Date(d),
        status: "HOLIDAY",
        scheduledHours: dayShiftHours,
        regularHours: 0,
        holidayType: holiday.holidayType,
        isRestDay: false,
      });
    } else {
      toCreate.push({
        companyId,
        employeeId,
        workDate: new Date(d),
        status: "PRESENT",
        scheduledHours: dayShiftHours,
        regularHours: dayShiftHours,
        isRestDay: false,
      });
    }
  }

  return toCreate;
}
