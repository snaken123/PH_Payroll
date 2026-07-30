import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertCompanyId, requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { Prisma } from "@/lib/generated/prisma/client";
import { updateEmployeeSchema } from "@/lib/validations/employee";

const MANAGE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      branch: true,
      compensationRecords: { orderBy: { effectiveFrom: "desc" }, include: { allowances: true } },
    },
  });

  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    assertCompanyId(ctx, employee.companyId);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ employee });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    assertCompanyId(ctx, existing.companyId);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { dateSeparated, birthDate, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (dateSeparated !== undefined) data.dateSeparated = new Date(dateSeparated);
  if (birthDate !== undefined) data.birthDate = new Date(birthDate);

  try {
    const employee = await prisma.employee.update({ where: { id }, data });
    return NextResponse.json({ employee });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Employee number already in use" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update employee" }, { status: 400 });
  }
}
