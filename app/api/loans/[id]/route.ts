import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertCompanyId, getTenantContext } from "@/lib/db/scoped";
import { CompanyRole, LoanStatus } from "@/lib/generated/prisma/enums";
import { updateLoanSchema } from "@/lib/validations/loan";
import { hasPermission } from "@/lib/permissions";

const MANAGE_ROLES: CompanyRole[] = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await getTenantContext();
    const canManage =
      ctx.isSuperAdmin ||
      (ctx.companyRole !== null && MANAGE_ROLES.includes(ctx.companyRole)) ||
      hasPermission(ctx.permissions, "loans.create", ctx.platformRole);
    if (!canManage) throw new Error("Forbidden");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const parsed = updateLoanSchema.safeParse(body);
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

  if (loan.status !== LoanStatus.ACTIVE) {
    return NextResponse.json({ error: `Cannot cancel a loan in ${loan.status} status` }, { status: 409 });
  }

  const updated = await prisma.loan.update({
    where: { id },
    data: { status: LoanStatus.CANCELLED },
  });

  return NextResponse.json({ loan: updated });
}
