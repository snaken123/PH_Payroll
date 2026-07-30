import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { PlatformRole } from "@/lib/generated/prisma/enums";

// Lists companies for the company switcher — distinct from GET
// /api/companies, which is the platform-admin-only listing used on the
// /admin companies page. Super admins see every company on the platform
// (they can already switch into any of them, see lib/auth.ts); everyone
// else sees only companies they hold an active membership in.
export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.platformRole === PlatformRole.SUPER_ADMIN) {
    const companies = await prisma.company.findMany({
      select: { id: true, legalName: true },
      orderBy: { legalName: "asc" },
    });
    return NextResponse.json({ companies: companies.map((c) => ({ ...c, role: null })) });
  }

  const memberships = await prisma.companyMembership.findMany({
    where: { userId: session.user.id, isActive: true },
    include: { company: { select: { id: true, legalName: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    companies: memberships.map((m) => ({ id: m.company.id, legalName: m.company.legalName, role: m.role })),
  });
}
