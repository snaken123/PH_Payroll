import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantRole, withCompanyScope } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";

const VIEW_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

export async function GET() {
  let ctx;
  try {
    ctx = await requireTenantRole(VIEW_ROLES, { permissionKey: ["leave.view", "leave.manage"] });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const leaveTypes = await prisma.leaveType.findMany({
    where: withCompanyScope(ctx.companyId),
    orderBy: { isStatutory: "desc" },
  });

  return NextResponse.json({ leaveTypes });
}
