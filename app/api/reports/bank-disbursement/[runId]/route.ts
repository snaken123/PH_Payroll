import { NextResponse } from "next/server";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { getBankDisbursementData } from "@/lib/reports/queries";
import { BankDisbursementDocument } from "@/lib/reports/documents/BankDisbursementDocument";
import { pdfResponse } from "@/lib/reports/renderPdf";
import { logGeneratedDocument } from "@/lib/reports/logDocument";

const VIEW_ROLES = [
  CompanyRole.COMPANY_OWNER,
  CompanyRole.PAYROLL_ADMIN,
  CompanyRole.HR_STAFF,
];

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> }
) {
  let ctx;
  try {
    ctx = await requireTenantRole(VIEW_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { runId } = await context.params;

  try {
    const data = await getBankDisbursementData(ctx.companyId, runId);

    await logGeneratedDocument({
      companyId: ctx.companyId,
      documentType: "BANK_DISBURSEMENT",
      sourceType: "PAYROLL_RUN",
      sourceRunId: runId,
      generatedByUserId: ctx.userId,
    });

    return pdfResponse(
      BankDisbursementDocument({ data }),
      `bank_disbursement_run_${data.runNumber}.pdf`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate bank disbursement report";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
