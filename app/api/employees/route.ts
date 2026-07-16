import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantRole, withCompanyScope } from "@/lib/db/scoped";
import { createEmployeeSchema } from "@/lib/validations/employee";
import { CompanyRole, EmploymentStatus, PaymentMethod } from "@/lib/generated/prisma/enums";
import { Prisma } from "@/lib/generated/prisma/client";

const MANAGE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

export async function GET() {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employees = await prisma.employee.findMany({
    where: withCompanyScope(ctx.companyId),
    include: {
      branch: { select: { name: true } },
      compensationRecords: {
        where: { effectiveTo: null },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ employees });
}

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Branch must belong to the same tenant — reject rather than silently
  // rescoping, since a cross-tenant branchId here indicates either a bug
  // or an attempted IDOR probe.
  const branch = await prisma.companyBranch.findFirst({
    where: withCompanyScope(ctx.companyId, { id: data.branchId }),
  });
  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 400 });
  }

  try {
    const employee = await prisma.$transaction(async (tx) => {
      const created = await tx.employee.create({
        data: {
          companyId: ctx.companyId,
          branchId: data.branchId,
          employeeNumber: data.employeeNumber,
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName || null,
          birthDate: new Date(data.birthDate),
          sex: data.sex,
          civilStatus: data.civilStatus,
          tin: data.tin || null,
          sssNumber: data.sssNumber || null,
          philhealthNumber: data.philhealthNumber || null,
          pagibigNumber: data.pagibigNumber || null,
          employeeType: data.employeeType,
          employmentStatus: EmploymentStatus.PROBATIONARY,
          dateHired: new Date(data.dateHired),
          departmentName: data.departmentName || null,
          positionTitle: data.positionTitle,
          isManagerialExempt: data.employeeType === "MANAGERIAL_SUPERVISORY" ? data.isManagerialExempt : false,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          compensationRecords: {
            create: {
              effectiveFrom: new Date(data.dateHired),
              payBasis: data.payBasis,
              basicRate: data.basicRate,
              standardWorkDaysPerMonth: data.standardWorkDaysPerMonth ?? null,
              createdByUserId: ctx.userId,
            },
          },
        },
      });

      // Grant the current year's balance for every leave type the company
      // has configured (SIL + any custom types) — not prorated by hire date
      // in Phase 3.
      const leaveTypes = await tx.leaveType.findMany({ where: { companyId: ctx.companyId } });
      if (leaveTypes.length > 0) {
        await tx.leaveBalance.createMany({
          data: leaveTypes.map((lt) => ({
            employeeId: created.id,
            leaveTypeId: lt.id,
            year: new Date().getFullYear(),
            entitledDays: lt.defaultDaysPerYear,
          })),
        });
      }

      return created;
    });

    return NextResponse.json({ employee }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Employee number already in use" }, { status: 409 });
    }
    throw err;
  }
}
