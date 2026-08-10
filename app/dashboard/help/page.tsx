import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/db/scoped";
import { HelpClient } from "./help-client";

export default async function HelpPage() {
  await getTenantContext();

  const [sssBrackets, philhealthConfig, pagibigBracket, birBrackets, deMinimisCeilings] = await Promise.all([
    prisma.sssContributionBracket.findMany({
      orderBy: { mscFloor: "asc" },
    }),
    prisma.philhealthConfig.findFirst({
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.pagibigContributionBracket.findFirst({
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.birWithholdingBracket.findMany({
      orderBy: [{ payPeriodType: "asc" }, { bracketFloor: "asc" }],
    }),
    prisma.deMinimisCeiling.findMany({
      orderBy: { category: "asc" },
    }),
  ]);

  return (
    <HelpClient
      sssBrackets={sssBrackets.map((b) => ({
        id: b.id,
        mscFloor: Number(b.mscFloor),
        mscCeiling: Number(b.mscCeiling),
        msc: Number(b.msc),
        eeShare: Number(b.eeShare),
        erShare: Number(b.erShare),
        mpfEeShare: Number(b.mpfEeShare ?? 0),
        mpfErShare: Number(b.mpfErShare ?? 0),
        ecAmount: Number(b.ecAmount),
      }))}
      philhealthConfig={
        philhealthConfig
          ? {
              premiumRate: Number(philhealthConfig.premiumRate),
              eeShareRate: Number(philhealthConfig.eeShareRate),
              erShareRate: Number(philhealthConfig.erShareRate),
              floorSalary: Number(philhealthConfig.floorSalary),
              ceilingSalary: Number(philhealthConfig.ceilingSalary),
            }
          : null
      }
      pagibigBracket={
        pagibigBracket
          ? {
              salaryThreshold: Number(pagibigBracket.salaryThreshold),
              eeRateBelowThreshold: Number(pagibigBracket.eeRateBelowThreshold),
              erRateBelowThreshold: Number(pagibigBracket.erRateBelowThreshold),
              eeRateAboveThreshold: Number(pagibigBracket.eeRateAboveThreshold),
              erRateAboveThreshold: Number(pagibigBracket.erRateAboveThreshold),
              maxFundSalary: Number(pagibigBracket.maxFundSalary),
              eeCap: Number(pagibigBracket.eeCap),
              erCap: Number(pagibigBracket.erCap),
            }
          : null
      }
      birBrackets={birBrackets.map((b) => ({
        id: b.id,
        payPeriodType: b.payPeriodType,
        minCompensation: Number(b.bracketFloor),
        maxCompensation: b.bracketCeiling ? Number(b.bracketCeiling) : null,
        baseTaxAmount: Number(b.baseTax),
        percentageOverMin: Number(b.excessRate) * 100,
      }))}
      deMinimisCeilings={deMinimisCeilings.map((c) => ({
        id: c.id,
        category: c.category,
        ceilingAmount: Number(c.ceilingAmount),
        frequency: c.frequency,
        sourceReference: c.sourceReference,
      }))}
    />
  );
}
