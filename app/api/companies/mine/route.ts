import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

// Lists every company the current user has an active membership in, for the
// company switcher — distinct from GET /api/companies, which is the
// platform-admin listing of every company on the system.
export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.companyMembership.findMany({
    where: { userId: session.user.id, isActive: true },
    include: { company: { select: { id: true, legalName: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    companies: memberships.map((m) => ({ id: m.company.id, legalName: m.company.legalName, role: m.role })),
  });
}
