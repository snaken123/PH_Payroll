import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantRole, withCompanyScope } from "@/lib/db/scoped";
import { generateDefaultEntriesSchema } from "@/lib/validations/attendance";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { computeDefaultEntries, toDateOnly } from "@/lib/services/attendanceDefaults";

const MANAGE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

/**
 * Bootstraps a cutoff with default entries so HR only has to edit the
 * exceptions (absences, OT, holiday work) instead of typing every day. See
 * lib/services/attendanceDefaults.ts for the defaulting rules.
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

  const toCreate = await computeDefaultEntries(ctx.companyId, employeeId, startDate, endDate);

  if (toCreate.length > 0) {
    await prisma.timesheetEntry.createMany({ data: toCreate });
  }

  return NextResponse.json({ created: toCreate.length });
}
