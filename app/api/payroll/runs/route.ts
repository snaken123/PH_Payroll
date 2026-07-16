import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantRole } from "@/lib/db/scoped";
import { createPayrollRunSchema } from "@/lib/validations/payroll";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { computeAndPersistPayrollRun, PayrollRunError } from "@/lib/services/payrollRunService";

const RUN_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

export async function GET() {
  let ctx;
  try {
    ctx = await requireTenantRole(RUN_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const runs = await prisma.payrollRun.findMany({
    where: { companyId: ctx.companyId },
    include: {
      payrollPeriod: true,
      _count: { select: { payslips: true } },
    },
    orderBy: { runNumber: "desc" },
  });

  return NextResponse.json({ runs });
}

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(RUN_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createPayrollRunSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  try {
    const runId = await computeAndPersistPayrollRun({
      companyId: ctx.companyId,
      cutoffStart: new Date(data.cutoffStart),
      cutoffEnd: new Date(data.cutoffEnd),
      payDate: new Date(data.payDate),
      periodType: data.periodType,
      computedByUserId: ctx.userId,
    });

    return NextResponse.json({ runId }, { status: 201 });
  } catch (err) {
    if (err instanceof PayrollRunError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
