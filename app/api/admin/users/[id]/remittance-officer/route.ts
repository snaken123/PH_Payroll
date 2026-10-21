import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session || session.user.platformRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin required" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();

  if (typeof body.isRemittanceOfficer !== "boolean") {
    return NextResponse.json({ error: "isRemittanceOfficer boolean is required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      isRemittanceOfficer: body.isRemittanceOfficer,
    },
    select: {
      id: true,
      name: true,
      email: true,
      isRemittanceOfficer: true,
      platformRole: true,
    },
  });

  return NextResponse.json({ user });
}
