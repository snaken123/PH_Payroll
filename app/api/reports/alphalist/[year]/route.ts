import { NextResponse } from "next/server";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { getBirAlphalistData } from "@/lib/reports/queries";
import { BirAlphalistDocument } from "@/lib/reports/documents/BirAlphalistDocument";
import { pdfResponse } from "@/lib/reports/renderPdf";
import { logGeneratedDocument } from "@/lib/reports/logDocument";

const VIEW_ROLES = [
  CompanyRole.COMPANY_OWNER,
  CompanyRole.PAYROLL_ADMIN,
  CompanyRole.HR_STAFF,
];

export async function GET(
  _request: Request,
  context: { params: Promise<{ year: string }> }
) {
  let ctx;
  try {
    ctx = await requireTenantRole(VIEW_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { year } = await context.params;
  const yearNum = Number(year);
  if (!Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  try {
    const data = await getBirAlphalistData(ctx.companyId, yearNum);

    await logGeneratedDocument({
      companyId: ctx.companyId,
      documentType: "BIR_ALPHALIST",
      sourceType: "PERIOD_RANGE",
      sourcePeriodStart: new Date(Date.UTC(yearNum, 0, 1)),
      sourcePeriodEnd: new Date(Date.UTC(yearNum, 11, 31)),
      generatedByUserId: ctx.userId,
    });

    return pdfResponse(
      BirAlphalistDocument({ data }),
      `bir_alphalist_${yearNum}.pdf`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate report";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
