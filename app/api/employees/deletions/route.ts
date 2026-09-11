import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";

export async function GET() {
  const ctx = await getTenantContext();

  const auditLogs = await prisma.employeeDeletionAudit.findMany({
    where: withCompanyScope(ctx.companyId),
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ auditLogs });
}
