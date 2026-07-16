import { NextResponse } from "next/server";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole, DocumentType } from "@/lib/generated/prisma/enums";
import { getAgencyRemittanceData, ReportNotAvailableError, type RemittanceAgency } from "@/lib/reports/queries";
import { AgencyRemittanceDocument } from "@/lib/reports/documents/AgencyRemittanceDocument";
import { pdfResponse } from "@/lib/reports/renderPdf";
import { logGeneratedDocument } from "@/lib/reports/logDocument";

const VIEW_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];
const VALID_AGENCIES = ["SSS", "PHILHEALTH", "PAGIBIG"] as const;
const DOCUMENT_TYPE_BY_AGENCY: Record<RemittanceAgency, DocumentType> = {
  SSS: "SSS_R3",
  PHILHEALTH: "PHILHEALTH_RF1",
  PAGIBIG: "PAGIBIG_MCRF",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ agency: string; runId: string }> }
) {
  let ctx;
  try {
    ctx = await requireTenantRole(VIEW_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { agency, runId } = await context.params;
  const agencyUpper = agency.toUpperCase();
  if (!VALID_AGENCIES.includes(agencyUpper as RemittanceAgency)) {
    return NextResponse.json({ error: "Unknown agency" }, { status: 400 });
  }
  const typedAgency = agencyUpper as RemittanceAgency;

  try {
    const data = await getAgencyRemittanceData(ctx.companyId, runId, typedAgency);

    await logGeneratedDocument({
      companyId: ctx.companyId,
      documentType: DOCUMENT_TYPE_BY_AGENCY[typedAgency],
      sourceType: "PAYROLL_RUN",
      sourceRunId: runId,
      generatedByUserId: ctx.userId,
    });

    return pdfResponse(
      AgencyRemittanceDocument({ data }),
      `${typedAgency.toLowerCase()}-remittance-${runId}.pdf`
    );
  } catch (err) {
    if (err instanceof ReportNotAvailableError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
