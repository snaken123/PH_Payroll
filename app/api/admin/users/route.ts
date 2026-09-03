import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { createUserSchema } from "@/lib/validations/user";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getAuthSession();
  if (!session || session.user.platformRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin required" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      platformRole: true,
      createdAt: true,
      memberships: {
        select: {
          id: true,
          role: true,
          company: { select: { id: true, legalName: true } },
        },
      },
    },
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session || session.user.platformRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin required" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password, name, platformRole, companyId, companyRole } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email address already exists." }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      platformRole,
      ...(companyId && companyRole
        ? {
            memberships: {
              create: {
                companyId,
                role: companyRole,
              },
            },
          }
        : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      platformRole: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user }, { status: 201 });
}
