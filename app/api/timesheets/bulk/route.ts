import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertCompanyId, requireTenantRole, withCompanyScope } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { bulkUpdateTimesheetsSchema, combineDateAndTime } from "@/lib/validations/attendance";
import { mutationErrorResponse } from "@/lib/api-error";

const MANAGE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

// Saves every edited row of the attendance spreadsheet view in one request —
// each row is an upsert (create or update) keyed on [employeeId, workDate],
// same as the single-day POST /api/timesheets, just batched.
export async function PATCH(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = bulkUpdateTimesheetsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const employeeIds = [...new Set(parsed.data.rows.map((r) => r.employeeId))];
  const employees = await prisma.employee.findMany({
    where: withCompanyScope(ctx.companyId, { id: { in: employeeIds } }),
    select: { id: true, companyId: true },
  });
  const validEmployeeIds = new Set(employees.map((e) => e.id));

  for (const id of employeeIds) {
    if (!validEmployeeIds.has(id)) {
      return NextResponse.json({ error: `Employee ${id} not found` }, { status: 404 });
    }
  }
  for (const employee of employees) {
    try {
      assertCompanyId(ctx, employee.companyId);
    } catch {
      return NextResponse.json({ error: `Employee ${employee.id} not found` }, { status: 404 });
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const row of parsed.data.rows) {
        const workDate = new Date(row.workDate);
        const timeIn = combineDateAndTime(row.workDate, row.timeIn);
        const timeOut = combineDateAndTime(row.workDate, row.timeOut);

        await tx.timesheetEntry.upsert({
          where: { employeeId_workDate: { employeeId: row.employeeId, workDate } },
          update: {
            status: row.status,
            timeIn,
            timeOut,
            scheduledHours: row.scheduledHours,
            lateMinutes: row.lateMinutes,
            undertimeMinutes: row.undertimeMinutes,
            regularHours: row.regularHours,
            overtimeHours: row.overtimeHours,
            nightDiffHours: row.nightDiffHours,
            holidayType: row.holidayType || null,
            isRestDay: row.isRestDay,
            source: "MANUAL",
          },
          create: {
            companyId: ctx.companyId,
            employeeId: row.employeeId,
            workDate,
            status: row.status,
            timeIn,
            timeOut,
            scheduledHours: row.scheduledHours,
            lateMinutes: row.lateMinutes,
            undertimeMinutes: row.undertimeMinutes,
            regularHours: row.regularHours,
            overtimeHours: row.overtimeHours,
            nightDiffHours: row.nightDiffHours,
            holidayType: row.holidayType || null,
            isRestDay: row.isRestDay,
            source: "MANUAL",
          },
        });
      }
    });

    return NextResponse.json({ success: true, saved: parsed.data.rows.length });
  } catch (err) {
    return mutationErrorResponse(err);
  }
}
