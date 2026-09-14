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

  const rawCompanyIds: string[] = Array.isArray(body?.companyIds)
    ? body.companyIds.filter((id: unknown) => typeof id === "string" && id.trim())
    : typeof body?.companyId === "string" && body.companyId
    ? [body.companyId]
    : [];

  if (!username || !password || !name || rawCompanyIds.length === 0) {
    return NextResponse.json(
      { error: "Username, password, name, and at least one assigned company are required." },
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
  const primaryCompanyId = rawCompanyIds[0];

  const account = await prisma.attendanceAccount.create({
    data: {
      username,
      passwordHash,
      name,
      companyId: primaryCompanyId,
      isActive: true,
      companies: {
        create: rawCompanyIds.map((cId) => ({ companyId: cId })),
      },
    },
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

  return NextResponse.json({ account }, { status: 201 });
}

