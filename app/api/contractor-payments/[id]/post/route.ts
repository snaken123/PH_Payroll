import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertCompanyId, requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";

const POST_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

// Same immutability rule as PayrollRun: once POSTED, no update/delete path
// exists anywhere in this codebase for a ContractorPayment.
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(POST_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const payment = await prisma.contractorPayment.findUnique({ where: { id } });
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    assertCompanyId(ctx, payment.companyId);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (payment.status !== "DRAFT") {
    return NextResponse.json({ error: `Cannot post a payment in ${payment.status} status` }, { status: 409 });
  }

  const updated = await prisma.contractorPayment.update({
    where: { id },
    data: { status: "POSTED", postedAt: new Date(), postedByUserId: ctx.userId },
  });

  return NextResponse.json({ payment: updated });
}
