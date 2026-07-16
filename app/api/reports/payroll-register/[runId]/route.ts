import { NextResponse } from "next/server";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { getPayrollRegisterData, ReportNotAvailableError } from "@/lib/reports/queries";
import { PayrollRegisterDocument } from "@/lib/reports/documents/PayrollRegisterDocument";
import { pdfResponse } from "@/lib/reports/renderPdf";
import { logGeneratedDocument } from "@/lib/reports/logDocument";

const VIEW_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

export async function GET(_request: Request, context: { params: Promise<{ runId: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(VIEW_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { runId } = await context.params;

  try {
    const data = await getPayrollRegisterData(ctx.companyId, runId);

    await logGeneratedDocument({
      companyId: ctx.companyId,
      documentType: "PAYROLL_REGISTER",
      sourceType: "PAYROLL_RUN",
      sourceRunId: runId,
      generatedByUserId: ctx.userId,
    });

    return pdfResponse(
      PayrollRegisterDocument({ data }),
      `payroll-register-run-${data.runNumber}.pdf`
    );
  } catch (err) {
    if (err instanceof ReportNotAvailableError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
