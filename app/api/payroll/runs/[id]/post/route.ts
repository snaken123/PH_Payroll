import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertCompanyId, requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole, LineItemDirection, LoanStatus } from "@/lib/generated/prisma/enums";
import { mutationErrorResponse } from "@/lib/api-error";

const POST_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

// Posting is the point of no return: once POSTED, this run and its payslips
// are immutable at the application layer (no update/delete path exists for
// a posted run anywhere in this codebase — corrections require a new
// adjustment run referencing this one, not editing it in place).
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(POST_ROLES);
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

  if (run.status !== "APPROVED") {
    return NextResponse.json({ error: `Cannot post a run in ${run.status} status` }, { status: 409 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const runWithPayslips = await tx.payrollRun.findUnique({
        where: { id },
        include: {
          payrollPeriod: true,
          payslips: {
            include: {
              lineItems: {
                where: { direction: LineItemDirection.DEDUCTION },
              },
            },
          },
        },
      });

      if (!runWithPayslips) throw new Error("Run not found");

      const cutoffEnd = runWithPayslips.payrollPeriod.cutoffEnd;

      for (const payslip of runWithPayslips.payslips) {
        for (const li of payslip.lineItems) {
          const sourceRef = li.sourceRef as { loanId?: string } | null;
          if (sourceRef?.loanId) {
            const loan = await tx.loan.findUnique({ where: { id: sourceRef.loanId } });
            if (loan) {
              const amountDeducted = Number(li.amount);
              const currentBalance = loan.remainingBalance.toNumber();
              const balanceAfter = Math.max(0, currentBalance - amountDeducted);

              await tx.loanDeduction.create({
                data: {
                  loanId: loan.id,
                  payrollRunId: id,
                  cutoffDate: cutoffEnd,
                  amountDeducted: amountDeducted.toFixed(2),
                  balanceAfter: balanceAfter.toFixed(2),
                },
              });

              const isCompleted =
                (!loan.hasNoExpiration && !loan.endDate && balanceAfter <= 0) ||
                (loan.endDate !== null && cutoffEnd >= new Date(loan.endDate));

              await tx.loan.update({
                where: { id: loan.id },
                data: {
                  remainingBalance: loan.hasNoExpiration || loan.endDate ? "0.00" : balanceAfter.toFixed(2),
                  status: isCompleted ? LoanStatus.COMPLETED : LoanStatus.ACTIVE,
                },
              });
            }
          }
        }
      }

      return tx.payrollRun.update({
        where: { id },
        data: { status: "POSTED", postedAt: new Date(), postedByUserId: ctx.userId },
      });
    });

    return NextResponse.json({ run: updated });
  } catch (err) {
    return mutationErrorResponse(err);
  }
}
