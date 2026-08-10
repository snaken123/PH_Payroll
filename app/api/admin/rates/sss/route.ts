import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { updateSssRatesSchema } from "@/lib/validations/rates";

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateSssRatesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { effectiveFrom, sourceReference, brackets } = parsed.data;
  const newEffectiveFrom = new Date(effectiveFrom);
  const previousEffectiveTo = new Date(newEffectiveFrom);
  previousEffectiveTo.setDate(previousEffectiveTo.getDate() - 1);

  try {
    await prisma.$transaction(async (tx) => {
      // Close existing active brackets that don't have an end date
      await tx.sssContributionBracket.updateMany({
        where: {
          effectiveTo: null,
          effectiveFrom: { lt: newEffectiveFrom },
        },
        data: { effectiveTo: previousEffectiveTo },
      });

      // Insert new brackets
      await tx.sssContributionBracket.createMany({
        data: brackets.map((b) => ({
          effectiveFrom: newEffectiveFrom,
          mscFloor: b.mscFloor,
          mscCeiling: b.mscCeiling,
          msc: b.msc,
          eeShare: b.eeShare,
          erShare: b.erShare,
          mpfEeShare: b.mpfEeShare ?? null,
          mpfErShare: b.mpfErShare ?? null,
          ecAmount: b.ecAmount,
          sourceReference,
        })),
      });
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to update SSS brackets:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
