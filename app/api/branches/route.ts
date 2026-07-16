import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";

export async function GET() {
  let ctx;
  try {
    ctx = await getTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branches = await prisma.companyBranch.findMany({
    where: withCompanyScope(ctx.companyId),
    orderBy: { isHeadOffice: "desc" },
  });

  return NextResponse.json({ branches });
}
