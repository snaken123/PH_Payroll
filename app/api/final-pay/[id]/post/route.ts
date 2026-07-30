import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertCompanyId, requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { mutationErrorResponse } from "@/lib/api-error";

const POST_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

// Posting is the point of no return: once POSTED, this run is immutable at
// the application layer, same guarantee as PayrollRun/ContractorPayment.
// Additionally gated on Employee.clearanceCompleted — the PH-practice
// stand-in for withholding final pay pending property/accountability
// clearance (see plan notes; this is a single gate, not a checklist system).
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(POST_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const run = await prisma.finalPayRun.findUnique({
    where: { id },
    include: { employee: true, lineItems: true },
  });
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    assertCompanyId(ctx, run.companyId);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (run.status !== "APPROVED") {
    return NextResponse.json({ error: `Cannot post a run in ${run.status} status` }, { status: 409 });
  }
  if (!run.employee.clearanceCompleted) {
    return NextResponse.json(
      { error: "Cannot post final pay until the employee's clearance is marked complete" },
      { status: 409 }
    );
  }

  // Settle whichever loans were snapshotted into the LOAN_PAYOFF line item
  // at compute time — not "whatever the employee's active loans are now" —
  // deferred to posting (not compute time) because a DRAFT/APPROVED run can
  // still be voided without any money having actually moved.
  const loanPayoffLineItem = run.lineItems.find((li) => li.category === "LOAN_PAYOFF");
  const loansToSettle =
    (loanPayoffLineItem?.sourceRef as { loans?: { id: string; amount: string }[] } | null)?.loans ?? [];

  try {
    const updated = await prisma.$transaction(async (tx) => {
      for (const { id: loanId, amount } of loansToSettle) {
        await tx.loanDeduction.create({
          data: {
            loanId,
            finalPayRunId: run.id,
            cutoffDate: new Date(),
            amountDeducted: amount,
            balanceAfter: "0",
          },
        });
        await tx.loan.update({ where: { id: loanId }, data: { remainingBalance: "0", status: "COMPLETED" } });
      }

      return tx.finalPayRun.update({
        where: { id },
        data: { status: "POSTED", postedAt: new Date(), postedByUserId: ctx.userId },
      });
    });
    return NextResponse.json({ run: updated });
  } catch (err) {
    return mutationErrorResponse(err);
  }
}
