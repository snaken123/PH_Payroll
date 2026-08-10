import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { updatePhilhealthConfigSchema } from "@/lib/validations/rates";

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updatePhilhealthConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const newEffectiveFrom = new Date(data.effectiveFrom);
  const previousEffectiveTo = new Date(newEffectiveFrom);
  previousEffectiveTo.setDate(previousEffectiveTo.getDate() - 1);

  try {
    const config = await prisma.$transaction(async (tx) => {
      await tx.philhealthConfig.updateMany({
        where: {
          effectiveTo: null,
          effectiveFrom: { lt: newEffectiveFrom },
        },
        data: { effectiveTo: previousEffectiveTo },
      });

      return tx.philhealthConfig.create({
        data: {
          effectiveFrom: newEffectiveFrom,
          premiumRate: data.premiumRate,
          eeShareRate: data.eeShareRate,
          erShareRate: data.erShareRate,
          floorSalary: data.floorSalary,
          ceilingSalary: data.ceilingSalary,
          sourceReference: data.sourceReference,
        },
      });
    });

    return NextResponse.json({ config }, { status: 201 });
  } catch (error) {
    console.error("Failed to update PhilHealth config:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
