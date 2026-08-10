import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertCompanyId, requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";

const EDIT_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

export async function PATCH(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(EDIT_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { employeeId, isIncludedInAlphalist } = body;

  if (!employeeId || typeof isIncludedInAlphalist !== "boolean") {
    return NextResponse.json({ error: "Invalid employeeId or isIncludedInAlphalist flag" }, { status: 400 });
  }

  const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  try {
    assertCompanyId(ctx, emp.companyId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const updated = await prisma.employee.update({
      where: { id: employeeId },
      data: { isIncludedInAlphalist },
    });

    return NextResponse.json({ employee: updated });
  } catch (error) {
    console.error("Failed to update employee alphalist status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
