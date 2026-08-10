import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { updateBirBracketsSchema } from "@/lib/validations/rates";

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateBirBracketsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { effectiveFrom, sourceReference, brackets } = parsed.data;
  const newEffectiveFrom = new Date(effectiveFrom);
  const previousEffectiveTo = new Date(newEffectiveFrom);
  previousEffectiveTo.setDate(previousEffectiveTo.getDate() - 1);

  try {
    await prisma.$transaction(async (tx) => {
      // Close active brackets for the pay period types included in the payload
      const payPeriodTypes = Array.from(new Set(brackets.map((b) => b.payPeriodType)));

      await tx.birWithholdingBracket.updateMany({
        where: {
          effectiveTo: null,
          effectiveFrom: { lt: newEffectiveFrom },
          payPeriodType: { in: payPeriodTypes },
        },
        data: { effectiveTo: previousEffectiveTo },
      });

      await tx.birWithholdingBracket.createMany({
        data: brackets.map((b) => ({
          effectiveFrom: newEffectiveFrom,
          payPeriodType: b.payPeriodType,
          bracketFloor: b.bracketFloor,
          bracketCeiling: b.bracketCeiling ?? null,
          baseTax: b.baseTax,
          excessRate: b.excessRate,
          sourceReference,
        })),
      });
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to update BIR withholding tax brackets:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
