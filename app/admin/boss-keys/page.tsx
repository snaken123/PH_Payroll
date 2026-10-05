import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BossKeysClient } from "./boss-keys-client";

export default async function AdminBossKeysPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if (session.user.platformRole !== "SUPER_ADMIN") redirect("/dashboard");

  const companies = await prisma.company.findMany({
    select: {
      id: true,
      companyCode: true,
      legalName: true,
      tradeName: true,
      status: true,
      bossKeyIncludeOtherCompanyAllowances: true,
      bossKeyWaiveMandatoryMpfWisp: true,
      bossKeyAllowanceTaxableToggle: true,
      bossKeyWithholdingTaxToggle: true,
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

  return <BossKeysClient initialCompanies={companies} />;
}
