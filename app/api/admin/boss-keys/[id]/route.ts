import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";

const updateBossKeysSchema = z.object({
  bossKeyIncludeOtherCompanyAllowances: z.boolean().optional(),
  bossKeyWaiveMandatoryMpfWisp: z.boolean().optional(),
  bossKeyPayingCompanyAllowance: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session || session.user.platformRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const parsed = updateBossKeysSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.company.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const updatedCompany = await prisma.company.update({
    where: { id },
    data: parsed.data,
    select: {
      id: true,
      companyCode: true,
      legalName: true,
      bossKeyIncludeOtherCompanyAllowances: true,
      bossKeyWaiveMandatoryMpfWisp: true,
      bossKeyPayingCompanyAllowance: true,
    },
  });

  return NextResponse.json({ company: updatedCompany });
}
