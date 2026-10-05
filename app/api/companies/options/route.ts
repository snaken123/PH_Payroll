import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const activeCompanyId = session.user.companyId;
  const currentCompany = activeCompanyId
    ? await prisma.company.findUnique({
        where: { id: activeCompanyId },
        select: {
          bossKeyAllowanceTaxableToggle: true,
          bossKeyWithholdingTaxToggle: true,
        },
      })
    : null;

  const companies = await prisma.company.findMany({
    select: {
      id: true,
      legalName: true,
      tradeName: true,
      companyCode: true,
    },
    orderBy: { legalName: "asc" },
  });

  return NextResponse.json({
    companies,
    bossKeyAllowanceTaxableToggle: currentCompany?.bossKeyAllowanceTaxableToggle ?? false,
    bossKeyWithholdingTaxToggle: currentCompany?.bossKeyWithholdingTaxToggle ?? false,
  });
}
