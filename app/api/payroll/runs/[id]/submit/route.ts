import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertCompanyId, requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { mutationErrorResponse } from "@/lib/api-error";

// Segregation of duties: payroll admin or HR staff computes & submits run for approval
const SUBMIT_ROLES = [
  CompanyRole.COMPANY_OWNER,
  CompanyRole.PAYROLL_ADMIN,
  CompanyRole.HR_STAFF,
];

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(SUBMIT_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const run = await prisma.payrollRun.findUnique({ where: { id } });
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    assertCompanyId(ctx, run.companyId);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (run.status !== "DRAFT") {
    return NextResponse.json(
      { error: `Cannot submit a run in ${run.status} status for approval` },
      { status: 409 }
    );
  }

  try {
    const updated = await prisma.payrollRun.update({
      where: { id },
      data: { status: "PENDING_APPROVAL" },
    });
    return NextResponse.json({ run: updated });
  } catch (err) {
    return mutationErrorResponse(err);
  }
}
