import { NextResponse } from "next/server";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { getForm2316Data, ReportNotAvailableError } from "@/lib/reports/queries";
import { Form2316Document } from "@/lib/reports/documents/Form2316Document";
import { pdfResponse } from "@/lib/reports/renderPdf";
import { logGeneratedDocument } from "@/lib/reports/logDocument";

const VIEW_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

export async function GET(
  _request: Request,
  context: { params: Promise<{ employeeId: string; year: string }> }
) {
  let ctx;
  try {
    ctx = await requireTenantRole(VIEW_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { employeeId, year } = await context.params;
  const yearNum = Number(year);
  if (!Number.isInteger(yearNum)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  try {
    const data = await getForm2316Data(ctx.companyId, employeeId, yearNum);

    await logGeneratedDocument({
      companyId: ctx.companyId,
      documentType: "FORM_2316",
      sourceType: "PERIOD_RANGE",
      sourcePeriodStart: new Date(Date.UTC(yearNum, 0, 1)),
      sourcePeriodEnd: new Date(Date.UTC(yearNum, 11, 31)),
      employeeId,
      generatedByUserId: ctx.userId,
    });

    return pdfResponse(Form2316Document({ data }), `2316-${data.employee.employeeNumber}-${yearNum}.pdf`);
  } catch (err) {
    if (err instanceof ReportNotAvailableError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
