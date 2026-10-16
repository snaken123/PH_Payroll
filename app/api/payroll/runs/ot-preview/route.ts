import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole, EmploymentStatus } from "@/lib/generated/prisma/enums";
import { calculateTimesheetHours, type CompanyAttendanceConfig } from "@/lib/attendance/calculateHours";
import { extractTimeOfDay } from "@/lib/validations/attendance";

const RUN_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

export async function GET(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(RUN_ROLES, { permissionKey: "payroll.compute" });
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
  cutoffStart.setUTCHours(0, 0, 0, 0);

  const cutoffEnd = new Date(cutoffEndStr);
  cutoffEnd.setUTCHours(23, 59, 59, 999);

  if (isNaN(cutoffStart.getTime()) || isNaN(cutoffEnd.getTime())) {
    return NextResponse.json({ error: "Invalid date parameters" }, { status: 400 });
  }

  const [company, specialDaySchedules, employees] = await Promise.all([
    prisma.company.findUnique({
      where: { id: ctx.companyId },
    }),
    prisma.specialDaySchedule.findMany({
      where: {
        companyId: ctx.companyId,
        workDate: { gte: cutoffStart, lte: cutoffEnd },
      },
    }),
    prisma.employee.findMany({
      where: {
        companyId: ctx.companyId,
        isDeleted: false,
        isManagerialExempt: false,
        dateHired: { lte: cutoffEnd },
        OR: [
          {
            employmentStatus: { in: [EmploymentStatus.PROBATIONARY, EmploymentStatus.REGULAR, EmploymentStatus.RETAINER] },
            OR: [{ dateSeparated: null }, { dateSeparated: { gt: cutoffEnd } }],
          },
          {
            dateSeparated: { gt: cutoffEnd },
          },
        ],
      },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        positionTitle: true,
        scheduleType: true,
        timesheetEntries: {
          where: {
            workDate: { gte: cutoffStart, lte: cutoffEnd },
          },
          select: {
            id: true,
            workDate: true,
            status: true,
            timeIn: true,
            timeOut: true,
            overtimeHours: true,
            lateMinutes: true,
            undertimeMinutes: true,
          },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  const specialDayMap = new Map<string, (typeof specialDaySchedules)[0]>();
  for (const s of specialDaySchedules) {
    const dStr = s.workDate instanceof Date ? s.workDate.toISOString().slice(0, 10) : String(s.workDate).slice(0, 10);
    specialDayMap.set(dStr, s);
  }

  const attendanceConfig: CompanyAttendanceConfig = {
    attendanceStandardTimeIn: company?.attendanceStandardTimeIn,
    attendanceStandardTimeOut: company?.attendanceStandardTimeOut,
    attendanceLunchBreakMinutes: company?.attendanceLunchBreakMinutes,
    attendanceLateGracePeriodMinutes: company?.attendanceLateGracePeriodMinutes,
    attendanceOtGracePeriodMinutes: company?.attendanceOtGracePeriodMinutes,
    attendanceFlexi1WindowStart: company?.attendanceFlexi1WindowStart,
    attendanceFlexi1WindowEnd: company?.attendanceFlexi1WindowEnd,
    attendanceFlexi1LateGracePeriodMinutes: company?.attendanceFlexi1LateGracePeriodMinutes,
    attendanceSaturdayRuleEnabled: company?.attendanceSaturdayRuleEnabled,
    attendanceSaturdayWindowStart: company?.attendanceSaturdayWindowStart,
    attendanceSaturdayWindowEnd: company?.attendanceSaturdayWindowEnd,
    attendanceSaturdayGracePeriodMinutes: company?.attendanceSaturdayGracePeriodMinutes,
    attendanceSaturdayShiftHours: company?.attendanceSaturdayShiftHours,
    attendanceSaturdayBreakMinutes: company?.attendanceSaturdayBreakMinutes,
    attendanceSaturdayEmployeeIds: Array.isArray(company?.attendanceSaturdayEmployeeIds)
      ? (company?.attendanceSaturdayEmployeeIds as string[])
      : null,
  };

  const employeesWithOt: any[] = [];
  const employeesWithUndertime: any[] = [];

  for (const emp of employees) {
    let totalOtHours = 0;
    const undertimeEntries: Array<{ workDate: string; lateMinutes: number; undertimeMinutes: number }> = [];

    for (const t of emp.timesheetEntries) {
      let lateMins = t.lateMinutes || 0;
      let underMins = t.undertimeMinutes || 0;
      let otHours = Number(t.overtimeHours || 0);

      if (t.status === "PRESENT" || t.timeIn || t.timeOut) {
        const workDateStr = t.workDate.toISOString().slice(0, 10);
        const timeInStr = extractTimeOfDay(t.timeIn);
        const timeOutStr = extractTimeOfDay(t.timeOut);
        const specialDay = specialDayMap.get(workDateStr);

        const calc = calculateTimesheetHours({
          workDate: workDateStr,
          employeeId: emp.id,
          scheduleType: emp.scheduleType,
          timeIn: timeInStr,
          timeOut: timeOutStr,
          config: {
            ...attendanceConfig,
            specialDaySchedule: specialDay
              ? {
                  standardTimeIn: specialDay.standardTimeIn,
                  standardTimeOut: specialDay.standardTimeOut,
                  lunchBreakMinutes: specialDay.lunchBreakMinutes,
                  lateGracePeriodMinutes: specialDay.lateGracePeriodMinutes,
                  otGracePeriodMinutes: specialDay.otGracePeriodMinutes,
                }
              : null,
          },
        });

        lateMins = calc.lateMinutes;
        underMins = calc.undertimeMinutes;
        otHours = calc.overtimeHours;
      }

      totalOtHours += otHours;
      if (lateMins + underMins > 0) {
        undertimeEntries.push({
          workDate: t.workDate.toISOString(),
          lateMinutes: lateMins,
          undertimeMinutes: underMins,
        });
      }
    }

    if (totalOtHours > 0) {
      employeesWithOt.push({
        employeeId: emp.id,
        employeeNumber: emp.employeeNumber,
        employeeName: `${emp.lastName}, ${emp.firstName}`,
        positionTitle: emp.positionTitle ?? "",
        totalOtHours: Math.round(totalOtHours * 100) / 100,
      });
    }

    const totalUndertimeMinutes = undertimeEntries.reduce(
      (sum, t) => sum + t.lateMinutes + t.undertimeMinutes,
      0
    );
    if (totalUndertimeMinutes > 0) {
      employeesWithUndertime.push({
        employeeId: emp.id,
        employeeNumber: emp.employeeNumber,
        employeeName: `${emp.lastName}, ${emp.firstName}`,
        positionTitle: emp.positionTitle ?? "",
        totalUndertimeMinutes,
        totalUndertimeHours: Math.round((totalUndertimeMinutes / 60) * 100) / 100,
        entries: undertimeEntries,
      });
    }
  }

  return NextResponse.json({ employeesWithOt, employeesWithUndertime });
}
