import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { createCompanySchema } from "@/lib/validations/company";
import { CompanyRole, CompanyStatus } from "@/lib/generated/prisma/enums";
import { Prisma } from "@/lib/generated/prisma/client";

export async function GET() {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { employees: true, branches: true } },
    },
  });

  return NextResponse.json({ companies });
}

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createCompanySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  try {
    const passwordHash = await bcrypt.hash(data.ownerPassword, 10);

    const company = await prisma.$transaction(async (tx) => {
      const created = await tx.company.create({
        data: {
          companyCode: data.companyCode,
          legalName: data.legalName,
          tradeName: data.tradeName || null,
          tin: data.tin,
          rdoCode: data.rdoCode,
          sssEmployerNumber: data.sssEmployerNumber || null,
          philhealthEmployerNumber: data.philhealthEmployerNumber || null,
          pagibigEmployerId: data.pagibigEmployerId || null,
          registeredAddress: data.registeredAddress,
          region: data.region,
          status: CompanyStatus.ACTIVE,
          branches: {
            create: {
              branchCode: "0000",
              name: "Head Office",
              address: data.registeredAddress,
              region: data.region,
              isHeadOffice: true,
            },
          },
        },
      });

      const owner = await tx.user.upsert({
        where: { email: data.ownerEmail },
        update: {},
        create: { email: data.ownerEmail, name: data.ownerName, password: passwordHash },
      });

      await tx.companyMembership.create({
        data: { userId: owner.id, companyId: created.id, role: CompanyRole.COMPANY_OWNER },
      });

      // Every company gets the mandatory 5-day Service Incentive Leave
      // (PD 851 / Labor Code Art. 95) seeded automatically — non-deletable
      // in the UI, though not enforced at the schema level in Phase 3.
      await tx.leaveType.create({
        data: {
          companyId: created.id,
          name: "Service Incentive Leave",
          code: "SIL",
          isPaid: true,
          isStatutory: true,
          accrualPolicy: "ANNUAL_GRANT",
          defaultDaysPerYear: 5,
          isCarryOverAllowed: false,
          isConvertibleToCash: true,
        },
      });

      return created;
    });

    return NextResponse.json({ company }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "Company code or TIN is already in use" },
        { status: 409 }
      );
    }
    throw err;
  }
}
