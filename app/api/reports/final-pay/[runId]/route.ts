import { NextResponse } from "next/server";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { getFinalPayStatementData, ReportNotAvailableError } from "@/lib/reports/queries";
import { FinalPayStatementDocument } from "@/lib/reports/documents/FinalPayStatementDocument";
import { pdfResponse } from "@/lib/reports/renderPdf";
import { logGeneratedDocument } from "@/lib/reports/logDocument";

const VIEW_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

export async function GET(_request: Request, context: { params: Promise<{ runId: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(VIEW_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { runId } = await context.params;

  try {
    const data = await getFinalPayStatementData(ctx.companyId, runId);

    await logGeneratedDocument({
      companyId: ctx.companyId,
      documentType: "FINAL_PAY_STATEMENT",
      sourceType: "PAYROLL_RUN",
      sourceRunId: runId,
      generatedByUserId: ctx.userId,
    });

    return pdfResponse(
      FinalPayStatementDocument({ data }),
      `final-pay-${data.employee.employeeNumber}-${data.finalPayNumber}.pdf`
    );
  } catch (err) {
    if (err instanceof ReportNotAvailableError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
