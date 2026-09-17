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
          companyId: true,
          role: true,
          permissions: true,
          company: { select: { id: true, legalName: true, companyCode: true } },
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

  const { email, password, name, platformRole, companyId, companyRole, memberships } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email address already exists." }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  let membershipsCreate: Array<{ companyId: string; role: any; permissions: any }> = [];
  if (platformRole === "STANDARD") {
    if (memberships && memberships.length > 0) {
      membershipsCreate = memberships.map((m) => ({
        companyId: m.companyId,
        role: m.role || "HR_STAFF",
        permissions: m.permissions || [],
      }));
    } else if (companyId && companyRole) {
      membershipsCreate = [{ companyId, role: companyRole, permissions: [] }];
    }
  }

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      platformRole,
      ...(membershipsCreate.length > 0
        ? {
            memberships: {
              createMany: {
                data: membershipsCreate,
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
      memberships: {
        select: {
          id: true,
          companyId: true,
          role: true,
          permissions: true,
          company: { select: { id: true, legalName: true, companyCode: true } },
        },
      },
    },
  });

  return NextResponse.json({ user }, { status: 201 });
}
