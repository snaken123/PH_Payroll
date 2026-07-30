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
  const [existing, holidays] = await Promise.all([
    prisma.timesheetEntry.findMany({
      where: { employeeId, workDate: { gte: startDate, lte: endDate } },
      select: { workDate: true },
    }),
    prisma.companyHoliday.findMany({
      where: withCompanyScope(companyId, { date: { gte: startDate, lte: endDate } }),
    }),
  ]);

  const existingDates = new Set(existing.map((e) => e.workDate.toISOString().slice(0, 10)));
  const holidayByDate = new Map(holidays.map((h) => [h.date.toISOString().slice(0, 10), h]));

  const toCreate: DefaultEntryInput[] = [];

  for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateKey = d.toISOString().slice(0, 10);
    if (existingDates.has(dateKey)) continue;

    const isSunday = d.getUTCDay() === 0;
    const holiday = holidayByDate.get(dateKey);

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
        scheduledHours: 8,
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
        scheduledHours: 8,
        regularHours: 8,
        isRestDay: false,
      });
    }
  }

  return toCreate;
}
