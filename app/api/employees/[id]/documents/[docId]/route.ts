import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertCompanyId, requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";

const MANAGE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; docId: string }> }
) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, docId } = await context.params;

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee || employee.isDeleted) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  try {
    assertCompanyId(ctx, employee.companyId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const doc = await prisma.employeeDocument.findUnique({ where: { id: docId } });
  if (!doc || doc.employeeId !== id || doc.isDeleted) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const updatedDoc = await prisma.employeeDocument.update({
    where: { id: docId },
    data: { isDeleted: true },
  });

  return NextResponse.json({ document: updatedDoc });
}
