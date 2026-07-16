import { NextResponse } from "next/server";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { getForm1601CData } from "@/lib/reports/queries";
import { Form1601CDocument } from "@/lib/reports/documents/Form1601CDocument";
import { pdfResponse } from "@/lib/reports/renderPdf";
import { logGeneratedDocument } from "@/lib/reports/logDocument";

const VIEW_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

export async function GET(
  _request: Request,
  context: { params: Promise<{ year: string; month: string }> }
) {
  let ctx;
  try {
    ctx = await requireTenantRole(VIEW_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { year, month } = await context.params;
  const yearNum = Number(year);
  const monthNum = Number(month);
  if (!Number.isInteger(yearNum) || !Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
    return NextResponse.json({ error: "Invalid year or month" }, { status: 400 });
  }

  const data = await getForm1601CData(ctx.companyId, yearNum, monthNum);

  await logGeneratedDocument({
    companyId: ctx.companyId,
    documentType: "FORM_1601C",
    sourceType: "PERIOD_RANGE",
    sourcePeriodStart: new Date(Date.UTC(yearNum, monthNum - 1, 1)),
    sourcePeriodEnd: new Date(Date.UTC(yearNum, monthNum, 0)),
    generatedByUserId: ctx.userId,
  });

  return pdfResponse(Form1601CDocument({ data }), `1601c-${yearNum}-${String(monthNum).padStart(2, "0")}.pdf`);
}
