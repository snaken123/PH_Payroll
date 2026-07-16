import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantRole, withCompanyScope } from "@/lib/db/scoped";
import { createHolidaySchema } from "@/lib/validations/attendance";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { Prisma } from "@/lib/generated/prisma/client";

const MANAGE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

export async function GET() {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const holidays = await prisma.companyHoliday.findMany({
    where: withCompanyScope(ctx.companyId),
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ holidays });
}

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createHolidaySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  try {
    const holiday = await prisma.companyHoliday.create({
      data: {
        companyId: ctx.companyId,
        date: new Date(data.date),
        name: data.name,
        holidayType: data.holidayType,
        region: data.region || null,
      },
    });
    return NextResponse.json({ holiday }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "A holiday already exists on that date/region" }, { status: 409 });
    }
    throw err;
  }
}
