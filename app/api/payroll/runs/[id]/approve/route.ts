import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertCompanyId, requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { mutationErrorResponse } from "@/lib/api-error";

// Segregation of duties: the person who computed a run isn't required to be
// an APPROVER, but approving requires that role (or ownership).
const APPROVE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.APPROVER];

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(APPROVE_ROLES);
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

  if (run.status !== "PENDING_APPROVAL") {
    return NextResponse.json({ error: `Cannot approve a run in ${run.status} status. It must first be submitted for approval.` }, { status: 409 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const approvedRun = await tx.payrollRun.update({
        where: { id },
        data: { status: "APPROVED", approvedAt: new Date(), approvedByUserId: ctx.userId },
      });

      if (run.replacesRunId) {
        await tx.payrollRun.update({
          where: { id: run.replacesRunId },
          data: {
            status: "SUPERSEDED",
            supersededByRunId: id,
            supersededAt: new Date(),
          },
        });
      }

      return approvedRun;
    });

    return NextResponse.json({ run: updated });
  } catch (err) {
    return mutationErrorResponse(err);
  }
}
