import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertCompanyId, requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { mutationErrorResponse } from "@/lib/api-error";

const UNAPPROVE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.APPROVER, CompanyRole.PAYROLL_ADMIN];

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(UNAPPROVE_ROLES);
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

  if (run.status !== "APPROVED" && run.status !== "PENDING_APPROVAL") {
    return NextResponse.json(
      { error: `Cannot revert run in ${run.status} status back to draft.` },
      { status: 409 }
    );
  }

  try {
    const updated = await prisma.payrollRun.update({
      where: { id },
      data: {
        status: "DRAFT",
        approvedAt: null,
        approvedByUserId: null,
      },
    });

    return NextResponse.json({ run: updated });
  } catch (err) {
    return mutationErrorResponse(err);
  }
}
