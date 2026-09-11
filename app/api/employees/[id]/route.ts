import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertCompanyId, requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { Prisma } from "@/lib/generated/prisma/client";
import { updateEmployeeSchema, deleteEmployeeSchema } from "@/lib/validations/employee";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await requireTenantRole([CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF]);
  const { id } = await context.params;

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing || existing.isDeleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

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


export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await requireTenantRole([CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF]);
  const { id } = await context.params;

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      payslips: { take: 1, select: { id: true } },
      timesheetEntries: { take: 1, select: { id: true } },
      loans: { take: 1, select: { id: true } },
      finalPayRuns: { take: 1, select: { id: true } },
    },
  });

  if (!employee || employee.isDeleted) {
    return NextResponse.json({ error: "Employee not found or already deleted" }, { status: 404 });
  }

  assertCompanyId(ctx, employee.companyId);

  const body = await request.json().catch(() => ({}));
  const parsed = deleteEmployeeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { reason } = parsed.data;

  // Check if user has linked payroll history
  const hasPayrollHistory =
    employee.payslips.length > 0 ||
    employee.timesheetEntries.length > 0 ||
    employee.loans.length > 0 ||
    employee.finalPayRuns.length > 0;

  // Get deletedBy user details
  const deletingUser = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { name: true, email: true },
  });

  const deletedByUserName = deletingUser?.name || deletingUser?.email || ctx.userId;
  const fullName = `${employee.lastName}, ${employee.firstName}${employee.middleName ? ` ${employee.middleName}` : ""}`;

  // Execute deletion transaction: Create audit log & mark employee as soft-deleted
  const [auditLog] = await prisma.$transaction([
    prisma.employeeDeletionAudit.create({
      data: {
        companyId: employee.companyId,
        employeeId: employee.id,
        employeeNumber: employee.employeeNumber,
        employeeName: fullName,
        positionTitle: employee.positionTitle,
        departmentName: employee.departmentName,
        deletedByUserId: ctx.userId,
        deletedByUserName,
        reason,
        hasPayrollHistory,
      },
    }),
    prisma.employee.update({
      where: { id: employee.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedByUserId: ctx.userId,
        deletionReason: reason,
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    message: `Employee ${fullName} (${employee.employeeNumber}) was deleted successfully.`,
    audit: auditLog,
  });
}
