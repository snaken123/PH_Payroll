import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertCompanyId, requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { computeAndPersistPayrollRun } from "@/lib/services/payrollRunService";

const MANAGE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await prisma.payrollRun.findUnique({
    where: { id },
    include: { payrollPeriod: true },
  });

  if (!existing) return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });
  try {
    assertCompanyId(ctx, existing.companyId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (existing.status === "POSTED" || existing.status === "VOID") {
    return NextResponse.json(
      { error: "Cannot recompute a posted or voided payroll run" },
      { status: 400 }
    );
  }

  try {
    // Delete old draft payslips and re-calculate
    await prisma.$transaction(async (tx) => {
      await tx.payslip.deleteMany({ where: { payrollRunId: existing.id } });
      await tx.payrollRun.delete({ where: { id: existing.id } });
    });

    const newRunId = await computeAndPersistPayrollRun({
      companyId: ctx.companyId,
      cutoffStart: existing.payrollPeriod.cutoffStart,
      cutoffEnd: existing.payrollPeriod.cutoffEnd,
      payDate: existing.payrollPeriod.payDate,
      periodType: existing.payrollPeriod.periodType,
      computedByUserId: ctx.userId,
    });

    return NextResponse.json({ success: true, runId: newRunId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to recompute run";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
