import { NextResponse } from "next/server";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { getThirteenthMonthReportData } from "@/lib/reports/queries";
import { ThirteenthMonthDocument } from "@/lib/reports/documents/ThirteenthMonthDocument";
import { pdfResponse } from "@/lib/reports/renderPdf";
import { logGeneratedDocument } from "@/lib/reports/logDocument";

const VIEW_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

export async function GET(_request: Request, context: { params: Promise<{ year: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(VIEW_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { year } = await context.params;
  const yearNum = Number(year);
  if (!Number.isInteger(yearNum)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const data = await getThirteenthMonthReportData(ctx.companyId, yearNum);

  await logGeneratedDocument({
    companyId: ctx.companyId,
    documentType: "THIRTEENTH_MONTH_REPORT",
    sourceType: "PERIOD_RANGE",
    sourcePeriodStart: new Date(Date.UTC(yearNum, 0, 1)),
    sourcePeriodEnd: new Date(Date.UTC(yearNum, 11, 31)),
    generatedByUserId: ctx.userId,
  });

  return pdfResponse(ThirteenthMonthDocument({ data }), `13th-month-${yearNum}.pdf`);
}
