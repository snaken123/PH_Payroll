import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { updateMinimumWageRateSchema } from "@/lib/validations/rates";

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateMinimumWageRateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const newEffectiveFrom = new Date(data.effectiveFrom);
  const previousEffectiveTo = new Date(newEffectiveFrom);
  previousEffectiveTo.setDate(previousEffectiveTo.getDate() - 1);

  try {
    const rate = await prisma.$transaction(async (tx) => {
      await tx.minimumWageRate.updateMany({
        where: {
          region: data.region,
          sector: data.sector,
          effectiveTo: null,
          effectiveFrom: { lt: newEffectiveFrom },
        },
        data: { effectiveTo: previousEffectiveTo },
      });

      return tx.minimumWageRate.create({
        data: {
          effectiveFrom: newEffectiveFrom,
          region: data.region,
          sector: data.sector,
          dailyRate: data.dailyRate,
          wageOrderReference: data.wageOrderReference,
        },
      });
    });

    return NextResponse.json({ rate }, { status: 201 });
  } catch (error) {
    console.error("Failed to update Minimum Wage rate:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
