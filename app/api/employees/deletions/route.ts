import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";

export async function GET() {
  const ctx = await getTenantContext();
  const canView =
    ctx.isSuperAdmin ||
    ctx.companyRole === "COMPANY_OWNER" ||
    ctx.companyRole === "PAYROLL_ADMIN" ||
    ctx.permissions.includes("employee.delete") ||
    ctx.permissions.includes("employee.manage");

  if (!canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const auditLogs = await prisma.employeeDeletionAudit.findMany({
    where: withCompanyScope(ctx.companyId),
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ auditLogs });
}
