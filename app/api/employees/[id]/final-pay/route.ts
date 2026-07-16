import { NextResponse } from "next/server";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { computeAndPersistFinalPayRun, FinalPayError } from "@/lib/services/finalPayService";

const COMPUTE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(COMPUTE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: employeeId } = await context.params;

  try {
    const finalPayRunId = await computeAndPersistFinalPayRun({
      companyId: ctx.companyId,
      employeeId,
      computedByUserId: ctx.userId,
    });

    return NextResponse.json({ finalPayRunId }, { status: 201 });
  } catch (err) {
    if (err instanceof FinalPayError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
