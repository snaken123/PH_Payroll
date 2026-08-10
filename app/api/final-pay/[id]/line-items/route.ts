import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertCompanyId, requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { addManualFinalPayLineItemSchema } from "@/lib/validations/finalpay";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: runId } = await params;
  let ctx;
  try {
    ctx = await requireTenantRole([CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const run = await prisma.finalPayRun.findUnique({
    where: { id: runId },
    include: { lineItems: true },
  });

  if (!run) return NextResponse.json({ error: "Final pay run not found" }, { status: 404 });
  try {
    assertCompanyId(ctx, run.companyId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (run.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Line items can only be added to DRAFT final pay runs" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const parsed = addManualFinalPayLineItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.finalPayLineItem.create({
        data: {
          finalPayRunId: runId,
          category: data.category,
          direction: data.direction,
          description: data.description,
          amount: data.amount.toFixed(2),
          isTaxExempt: data.isTaxExempt,
        },
      });

      const updatedLineItems = await tx.finalPayLineItem.findMany({
        where: { finalPayRunId: runId },
      });

      const grossFinalPay = updatedLineItems
        .filter((li) => li.direction === "EARNING")
        .reduce((sum, li) => sum + li.amount.toNumber(), 0);
      const totalDeductions = updatedLineItems
        .filter((li) => li.direction === "DEDUCTION")
        .reduce((sum, li) => sum + li.amount.toNumber(), 0);
      const netFinalPay = grossFinalPay - totalDeductions;

      await tx.finalPayRun.update({
        where: { id: runId },
        data: {
          grossFinalPay: grossFinalPay.toFixed(2),
          totalDeductions: totalDeductions.toFixed(2),
          netFinalPay: netFinalPay.toFixed(2),
        },
      });
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to add final pay line item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
