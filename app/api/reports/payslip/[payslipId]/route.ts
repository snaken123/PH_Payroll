import { NextResponse } from "next/server";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { getPayslipReportData, ReportNotAvailableError } from "@/lib/reports/queries";
import { PayslipDocument } from "@/lib/reports/documents/PayslipDocument";
import { pdfResponse } from "@/lib/reports/renderPdf";
import { logGeneratedDocument } from "@/lib/reports/logDocument";

const VIEW_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

export async function GET(_request: Request, context: { params: Promise<{ payslipId: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(VIEW_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { payslipId } = await context.params;

  try {
    const data = await getPayslipReportData(ctx.companyId, payslipId);

    await logGeneratedDocument({
      companyId: ctx.companyId,
      documentType: "PAYSLIP",
      sourceType: "PAYROLL_RUN",
      generatedByUserId: ctx.userId,
    });

    return pdfResponse(
      PayslipDocument({ data }),
      `payslip-${data.employee.employeeNumber}-${data.period.payDate.toISOString().slice(0, 10)}.pdf`
    );
  } catch (err) {
    if (err instanceof ReportNotAvailableError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
