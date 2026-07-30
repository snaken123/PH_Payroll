import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantRole, withCompanyScope } from "@/lib/db/scoped";
import { createContractorSchema } from "@/lib/validations/contractor";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { Prisma } from "@/lib/generated/prisma/client";

const MANAGE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

export async function GET() {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contractors = await prisma.contractor.findMany({
    where: withCompanyScope(ctx.companyId),
    orderBy: { name: "asc" },
    take: 200, // safety cap — this endpoint has no consumer yet; the dashboard page paginates its own query
  });

  return NextResponse.json({ contractors });
}

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createContractorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  try {
    const contractor = await prisma.contractor.create({
      data: {
        companyId: ctx.companyId,
        name: data.name,
        tin: data.tin,
        address: data.address,
        atcCode: data.atcCode,
        defaultEwtRate: data.defaultEwtRate,
        isVatRegistered: data.isVatRegistered,
      },
    });
    return NextResponse.json({ contractor }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "A contractor with this TIN already exists" }, { status: 409 });
    }
    throw err;
  }
}
