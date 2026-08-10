import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { RatesAdminClient } from "./rates-admin-client";

export default async function AdminRatesPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if (session.user.platformRole !== "SUPER_ADMIN") redirect("/dashboard");

  const [
    sssBrackets,
    philhealthConfigs,
    pagibigBrackets,
    birBrackets,
    deMinimisCeilings,
    minimumWageRates,
    thirteenthMonthConfigs,
  ] = await Promise.all([
    prisma.sssContributionBracket.findMany({
      orderBy: [{ effectiveFrom: "desc" }, { mscFloor: "asc" }],
    }),
    prisma.philhealthConfig.findMany({
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.pagibigContributionBracket.findMany({
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.birWithholdingBracket.findMany({
      orderBy: [{ effectiveFrom: "desc" }, { payPeriodType: "asc" }, { bracketFloor: "asc" }],
    }),
    prisma.deMinimisCeiling.findMany({
      orderBy: [{ effectiveFrom: "desc" }, { category: "asc" }],
    }),
    prisma.minimumWageRate.findMany({
      orderBy: [{ effectiveFrom: "desc" }, { region: "asc" }],
    }),
    prisma.thirteenthMonthConfig.findMany({
      orderBy: { effectiveFrom: "desc" },
    }),
  ]);

  const initialData = JSON.parse(
    JSON.stringify({
      sssBrackets,
      philhealthConfigs,
      pagibigBrackets,
      birBrackets,
      deMinimisCeilings,
      minimumWageRates,
      thirteenthMonthConfigs,
    })
  );

  return <RatesAdminClient initialData={initialData} />;
}
