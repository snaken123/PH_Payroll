import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
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

    return NextResponse.json({
      sssBrackets,
      philhealthConfigs,
      pagibigBrackets,
      birBrackets,
      deMinimisCeilings,
      minimumWageRates,
      thirteenthMonthConfigs,
    });
  } catch (error) {
    console.error("Failed to fetch statutory rates:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
