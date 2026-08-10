import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { updateDeMinimisCeilingSchema } from "@/lib/validations/rates";

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateDeMinimisCeilingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const newEffectiveFrom = new Date(data.effectiveFrom);
  const previousEffectiveTo = new Date(newEffectiveFrom);
  previousEffectiveTo.setDate(previousEffectiveTo.getDate() - 1);

  try {
    const ceiling = await prisma.$transaction(async (tx) => {
      await tx.deMinimisCeiling.updateMany({
        where: {
          category: data.category,
          effectiveTo: null,
          effectiveFrom: { lt: newEffectiveFrom },
        },
        data: { effectiveTo: previousEffectiveTo },
      });

      return tx.deMinimisCeiling.create({
        data: {
          effectiveFrom: newEffectiveFrom,
          category: data.category,
          ceilingAmount: data.ceilingAmount,
          frequency: data.frequency,
          sourceReference: data.sourceReference,
        },
      });
    });

    return NextResponse.json({ ceiling }, { status: 201 });
  } catch (error) {
    console.error("Failed to update De Minimis ceiling:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
