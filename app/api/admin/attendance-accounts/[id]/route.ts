import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const existing = await prisma.attendanceAccount.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (typeof body?.username === "string" && body.username.trim()) {
    data.username = body.username.trim();
  }
  if (typeof body?.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }

  let companyIdsToSet: string[] | null = null;
  if (Array.isArray(body?.companyIds)) {
    companyIdsToSet = body.companyIds.filter((id: unknown) => typeof id === "string" && id.trim());
  } else if (typeof body?.companyId === "string" && body.companyId) {
    companyIdsToSet = [body.companyId];
  }

  if (companyIdsToSet && companyIdsToSet.length > 0) {
    data.companyId = companyIdsToSet[0];
  }
  if (typeof body?.isActive === "boolean") {
    data.isActive = body.isActive;
  }
  if (typeof body?.password === "string" && body.password.length > 0) {
    data.passwordHash = await bcrypt.hash(body.password, 10);
  }

  try {
    const account = await prisma.attendanceAccount.update({
      where: { id },
      data,
    });

    if (companyIdsToSet && companyIdsToSet.length > 0) {
      await prisma.attendanceAccountCompany.deleteMany({
        where: { attendanceAccountId: id },
      });
      await prisma.attendanceAccountCompany.createMany({
        data: companyIdsToSet.map((cId) => ({
          attendanceAccountId: id,
          companyId: cId,
        })),
      });
    }

    const updatedAccount = await prisma.attendanceAccount.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            legalName: true,
            companyCode: true,
          },
        },
        companies: {
          include: {
            company: {
              select: {
                id: true,
                legalName: true,
                companyCode: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ account: updatedAccount });
  } catch {
    return NextResponse.json({ error: "Failed to update attendance account" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    await prisma.attendanceAccount.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete account" }, { status: 400 });
  }
}
