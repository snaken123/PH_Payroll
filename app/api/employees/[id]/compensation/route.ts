import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertCompanyId, requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { compensationRecordSchema } from "@/lib/validations/employee";

const MANAGE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: employeeId } = await context.params;

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      compensationRecords: {
        where: { effectiveTo: null },
        orderBy: { effectiveFrom: "desc" },
        include: { allowances: true },
        take: 1,
      },
    },
  });
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
  const currentRecord = employee.compensationRecords[0];

  const updateType = data.updateType || "BOTH";

  // Determine pay basis & rate: fallback to active record if updating allowances only
  const payBasis = (updateType === "ALLOWANCE" && currentRecord) ? currentRecord.payBasis : (data.payBasis ?? currentRecord?.payBasis ?? "MONTHLY_RATE");
  const basicRate = (updateType === "ALLOWANCE" && currentRecord) ? currentRecord.basicRate : (data.basicRate ?? currentRecord?.basicRate ?? 0);
  const standardWorkDaysPerMonth = (updateType === "ALLOWANCE" && currentRecord)
    ? currentRecord.standardWorkDaysPerMonth
    : (data.standardWorkDaysPerMonth ?? currentRecord?.standardWorkDaysPerMonth ?? null);

  // Determine allowances: fallback to active allowances if updating basic rate only
  let allowancesToCreate: Array<{ label: string; amount: number | string; isTaxable: boolean; payingCompanyId?: string | null }> = [];

  if (updateType === "BASIC" && currentRecord) {
    allowancesToCreate = currentRecord.allowances.map((a) => ({
      label: a.label,
      amount: a.amount.toString(),
      isTaxable: a.isTaxable,
      payingCompanyId: a.payingCompanyId,
    }));
  } else {
    allowancesToCreate = data.allowances.map((a) => ({
      label: a.label,
      amount: a.amount,
      isTaxable: a.isTaxable,
      payingCompanyId: a.payingCompanyId || null,
    }));
  }

  // Persist any new custom allowance type names
  for (const a of allowancesToCreate) {
    if (a.label) {
      await prisma.allowanceType.upsert({
        where: { name: a.label },
        update: {},
        create: { name: a.label },
      });
    }
  }

  const record = await prisma.$transaction(async (tx) => {
    await tx.compensationRecord.updateMany({
      where: { employeeId, effectiveTo: null },
      data: { effectiveTo: effectiveFrom },
    });

    return tx.compensationRecord.create({
      data: {
        employeeId,
        effectiveFrom,
        payBasis,
        basicRate,
        standardWorkDaysPerMonth,
        createdByUserId: ctx.userId,
        allowances: {
          create: allowancesToCreate.map((a) => ({
            label: a.label,
            amount: a.amount,
            isTaxable: a.isTaxable,
            payingCompanyId: a.payingCompanyId || null,
          })),
        },
      },
      include: {
        allowances: {
          include: {
            payingCompany: { select: { id: true, legalName: true, tradeName: true } },
          },
        },
      },
    });
  });

  return NextResponse.json({ compensationRecord: record }, { status: 201 });
}
