import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantRole, withCompanyScope } from "@/lib/db/scoped";
import { generateDefaultEntriesForCompanySchema } from "@/lib/validations/attendance";
import { CompanyRole, EmploymentStatus } from "@/lib/generated/prisma/enums";
import { computeDefaultEntries, toDateOnly } from "@/lib/services/attendanceDefaults";

const MANAGE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

// Same bootstrap as /api/timesheets/bulk-generate, but for every active
// employee in the company at once — backs the "Generate defaults" action on
// the attendance spreadsheet view instead of doing this one employee at a time.
export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = generateDefaultEntriesForCompanySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { start, end } = parsed.data;
  const startDate = toDateOnly(new Date(start));
  const endDate = toDateOnly(new Date(end));

  const employees = await prisma.employee.findMany({
    where: withCompanyScope(ctx.companyId, {
      employmentStatus: { in: [EmploymentStatus.PROBATIONARY, EmploymentStatus.REGULAR] },
    }),
    select: { id: true },
  });

  let created = 0;
  for (const employee of employees) {
    const toCreate = await computeDefaultEntries(ctx.companyId, employee.id, startDate, endDate);
    if (toCreate.length > 0) {
      await prisma.timesheetEntry.createMany({ data: toCreate });
      created += toCreate.length;
    }
  }

  return NextResponse.json({ created, employeeCount: employees.length });
}
