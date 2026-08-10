import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { updateThirteenthMonthConfigSchema } from "@/lib/validations/rates";

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateThirteenthMonthConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const newEffectiveFrom = new Date(data.effectiveFrom);
  const previousEffectiveTo = new Date(newEffectiveFrom);
  previousEffectiveTo.setDate(previousEffectiveTo.getDate() - 1);

  try {
    const config = await prisma.$transaction(async (tx) => {
      await tx.thirteenthMonthConfig.updateMany({
        where: {
          effectiveTo: null,
          effectiveFrom: { lt: newEffectiveFrom },
        },
        data: { effectiveTo: previousEffectiveTo },
      });

      return tx.thirteenthMonthConfig.create({
        data: {
          effectiveFrom: newEffectiveFrom,
          exemptionCeiling: data.exemptionCeiling,
          sourceReference: data.sourceReference,
        },
      });
    });

    return NextResponse.json({ config }, { status: 201 });
  } catch (error) {
    console.error("Failed to update 13th Month Pay exemption ceiling:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
