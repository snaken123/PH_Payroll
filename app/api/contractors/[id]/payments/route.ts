import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertCompanyId, requireTenantRole } from "@/lib/db/scoped";
import { createContractorPaymentSchema } from "@/lib/validations/contractor";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { computeExpandedWithholdingTax } from "@/lib/contractors/computeExpandedWithholdingTax";

const MANAGE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: contractorId } = await context.params;

  const contractor = await prisma.contractor.findUnique({ where: { id: contractorId } });
  if (!contractor) return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  try {
    assertCompanyId(ctx, contractor.companyId);
  } catch {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createContractorPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const { ewtAmount, netAmount } = computeExpandedWithholdingTax(data.grossAmount, data.ewtRate);

  const lastPayment = await prisma.contractorPayment.findFirst({
    where: { companyId: ctx.companyId },
    orderBy: { paymentNumber: "desc" },
  });
  const paymentNumber = (lastPayment?.paymentNumber ?? 0) + 1;

  const payment = await prisma.contractorPayment.create({
    data: {
      companyId: ctx.companyId,
      contractorId,
      paymentNumber,
      paymentDate: new Date(data.paymentDate),
      grossAmount: data.grossAmount,
      ewtRate: data.ewtRate,
      ewtAmount: ewtAmount.toFixed(2),
      netAmount: netAmount.toFixed(2),
      invoiceReference: data.invoiceReference || null,
      status: "DRAFT",
      createdByUserId: ctx.userId,
    },
  });

  return NextResponse.json({ payment }, { status: 201 });
}
