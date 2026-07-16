import { NextResponse } from "next/server";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { getForm2307Data, ReportNotAvailableError } from "@/lib/reports/queries";
import { Form2307Document } from "@/lib/reports/documents/Form2307Document";
import { pdfResponse } from "@/lib/reports/renderPdf";
import { logGeneratedDocument } from "@/lib/reports/logDocument";

const VIEW_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

export async function GET(_request: Request, context: { params: Promise<{ paymentId: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(VIEW_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { paymentId } = await context.params;

  try {
    const data = await getForm2307Data(ctx.companyId, paymentId);

    await logGeneratedDocument({
      companyId: ctx.companyId,
      documentType: "FORM_2307",
      sourceType: "PAYROLL_RUN",
      generatedByUserId: ctx.userId,
    });

    return pdfResponse(Form2307Document({ data }), `2307-payment-${data.payment.paymentNumber}.pdf`);
  } catch (err) {
    if (err instanceof ReportNotAvailableError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
