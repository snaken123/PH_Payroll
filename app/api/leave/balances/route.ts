import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantRole, withCompanyScope } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";

const VIEW_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

export async function GET(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(VIEW_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const employeeId = url.searchParams.get("employeeId");
  if (!employeeId) {
    return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
  }

  const employee = await prisma.employee.findFirst({
    where: withCompanyScope(ctx.companyId, { id: employeeId }),
  });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const balances = await prisma.leaveBalance.findMany({
    where: { employeeId, year: new Date().getFullYear() },
    include: { leaveType: true },
  });

  return NextResponse.json({ balances });
}
