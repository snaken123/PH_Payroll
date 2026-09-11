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
  if (typeof body?.companyId === "string" && body.companyId) {
    data.companyId = body.companyId;
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
      include: {
        company: {
          select: {
            id: true,
            legalName: true,
            companyCode: true,
          },
        },
      },
    });

    return NextResponse.json({ account });
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
