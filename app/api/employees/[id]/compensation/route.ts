import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertCompanyId, requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { compensationRecordSchema } from "@/lib/validations/employee";

const MANAGE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

// Creates a new effective-dated compensation record and closes the
// previously-open one. Compensation is never overwritten in place so that
// past payroll runs always reflect the rate actually in effect at the time.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: employeeId } = await context.params;

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    assertCompanyId(ctx, employee.companyId);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = compensationRecordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const effectiveFrom = new Date(data.effectiveFrom);

  const record = await prisma.$transaction(async (tx) => {
    await tx.compensationRecord.updateMany({
      where: { employeeId, effectiveTo: null },
      data: { effectiveTo: effectiveFrom },
    });

    return tx.compensationRecord.create({
      data: {
        employeeId,
        effectiveFrom,
        payBasis: data.payBasis,
        basicRate: data.basicRate,
        standardWorkDaysPerMonth: data.standardWorkDaysPerMonth ?? null,
        createdByUserId: ctx.userId,
        allowances: {
          create: data.allowances.map((a) => ({
            label: a.label,
            amount: a.amount,
            isTaxable: a.isTaxable,
          })),
        },
      },
    });
  });

  return NextResponse.json({ compensationRecord: record }, { status: 201 });
}
