import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
  const session = await getAuthSession();
  if (!session || session.user.platformRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companies = await prisma.company.findMany({
    select: {
      id: true,
      companyCode: true,
      legalName: true,
      tradeName: true,
      status: true,
      bossKeyIncludeOtherCompanyAllowances: true,
      bossKeyWaiveMandatoryMpfWisp: true,
      bossKeyPayingCompanyAllowance: true,
      includeOtherCompanyAllowancesInContributions: true,
      waiveMandatoryMpfWisp: true,
      _count: {
        select: {
          employees: true,
        },
      },
    },
    orderBy: {
      legalName: "asc",
    },
  });

  return NextResponse.json({ companies });
}
