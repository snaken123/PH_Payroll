import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const accounts = await prisma.attendanceAccount.findMany({
    orderBy: { createdAt: "desc" },
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

  return NextResponse.json({ accounts });
}

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const companyId = typeof body?.companyId === "string" ? body.companyId : "";

  if (!username || !password || !name || !companyId) {
    return NextResponse.json(
      { error: "Username, password, name, and assigned company are required." },
      { status: 400 }
    );
  }

  const existing = await prisma.attendanceAccount.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json(
      { error: "Username is already taken by another account." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const account = await prisma.attendanceAccount.create({
    data: {
      username,
      passwordHash,
      name,
      companyId,
      isActive: true,
    },
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

  return NextResponse.json({ account }, { status: 201 });
}
