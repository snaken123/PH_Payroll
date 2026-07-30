import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertCompanyId, requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole, LoanStatus } from "@/lib/generated/prisma/enums";
import { rejectLoanSchema } from "@/lib/validations/loan";
import { mutationErrorResponse } from "@/lib/api-error";

const APPROVE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.APPROVER];

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(APPROVE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const parsed = rejectLoanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const loan = await prisma.loan.findUnique({ where: { id } });
  if (!loan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    assertCompanyId(ctx, loan.companyId);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (loan.status !== LoanStatus.PENDING_APPROVAL) {
    return NextResponse.json({ error: `Cannot reject a loan in ${loan.status} status` }, { status: 409 });
  }

  try {
    const updated = await prisma.loan.update({
      where: { id },
      data: { status: LoanStatus.REJECTED, rejectionReason: parsed.data.reason },
    });
    return NextResponse.json({ loan: updated });
  } catch (err) {
    return mutationErrorResponse(err);
  }
}
