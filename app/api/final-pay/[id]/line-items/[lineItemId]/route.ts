import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertCompanyId, requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; lineItemId: string }> }
) {
  const { id: runId, lineItemId } = await params;
  let ctx;
  try {
    ctx = await requireTenantRole([CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN], {
      permissionKey: ["payroll.compute", "employee.manage"],
    });
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
      { error: "Line items can only be removed from DRAFT final pay runs" },
      { status: 400 }
    );
  }

  const existingLineItem = run.lineItems.find((li) => li.id === lineItemId);
  if (!existingLineItem) {
    return NextResponse.json({ error: "Line item not found" }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.finalPayLineItem.delete({
        where: { id: lineItemId },
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete final pay line item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
