import { NextResponse } from "next/server";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { getCertificateOfEmploymentData, ReportNotAvailableError } from "@/lib/reports/queries";
import { CertificateOfEmploymentDocument } from "@/lib/reports/documents/CertificateOfEmploymentDocument";
import { pdfResponse } from "@/lib/reports/renderPdf";
import { logGeneratedDocument } from "@/lib/reports/logDocument";

const VIEW_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

export async function GET(_request: Request, context: { params: Promise<{ employeeId: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(VIEW_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { employeeId } = await context.params;

  try {
    const data = await getCertificateOfEmploymentData(ctx.companyId, employeeId);

    await logGeneratedDocument({
      companyId: ctx.companyId,
      documentType: "CERTIFICATE_OF_EMPLOYMENT",
      sourceType: "PERIOD_RANGE",
      employeeId,
      generatedByUserId: ctx.userId,
    });

    return pdfResponse(CertificateOfEmploymentDocument({ data }), `certificate-of-employment-${employeeId}.pdf`);
  } catch (err) {
    if (err instanceof ReportNotAvailableError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
