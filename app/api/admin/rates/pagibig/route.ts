import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { updatePagibigBracketSchema } from "@/lib/validations/rates";

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updatePagibigBracketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const newEffectiveFrom = new Date(data.effectiveFrom);
  const previousEffectiveTo = new Date(newEffectiveFrom);
  previousEffectiveTo.setDate(previousEffectiveTo.getDate() - 1);

  try {
    const bracket = await prisma.$transaction(async (tx) => {
      await tx.pagibigContributionBracket.updateMany({
        where: {
          effectiveTo: null,
          effectiveFrom: { lt: newEffectiveFrom },
        },
        data: { effectiveTo: previousEffectiveTo },
      });

      return tx.pagibigContributionBracket.create({
        data: {
          effectiveFrom: newEffectiveFrom,
          salaryThreshold: data.salaryThreshold,
          eeRateBelowThreshold: data.eeRateBelowThreshold,
          erRateBelowThreshold: data.erRateBelowThreshold,
          eeRateAboveThreshold: data.eeRateAboveThreshold,
          erRateAboveThreshold: data.erRateAboveThreshold,
          maxFundSalary: data.maxFundSalary,
          eeCap: data.eeCap,
          erCap: data.erCap,
          sourceReference: data.sourceReference,
        },
      });
    });

    return NextResponse.json({ bracket }, { status: 201 });
  } catch (error) {
    console.error("Failed to update Pag-IBIG config:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
