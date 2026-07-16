import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertCompanyId, requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";

const VOID_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];
const voidSchema = z.object({ reason: z.string().min(1, "A reason is required") });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(VOID_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const parsed = voidSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payment = await prisma.contractorPayment.findUnique({ where: { id } });
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    assertCompanyId(ctx, payment.companyId);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (payment.status !== "DRAFT") {
    return NextResponse.json({ error: `Cannot void a payment in ${payment.status} status` }, { status: 409 });
  }

  const updated = await prisma.contractorPayment.update({
    where: { id },
    data: {
      status: "VOID",
      voidedAt: new Date(),
      voidedByUserId: ctx.userId,
      voidReason: parsed.data.reason,
    },
  });

  return NextResponse.json({ payment: updated });
}
