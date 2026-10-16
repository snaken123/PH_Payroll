import { NextResponse } from "next/server";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { tagStatutoryPayment } from "@/lib/services/statutoryPaymentService";
import { mutationErrorResponse } from "@/lib/api-error";

const TAG_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(TAG_ROLES, {
      permissionKey: ["reports.view", "payroll.post"],
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      agency,
      payrollRunId,
      periodMonth,
      periodYear,
      computedEeAmount,
      computedErAmount,
      computedTotalAmount,
      status,
      paidAmount,
      paymentDate,
      paymentMethod,
      checkNumber,
      referenceNumber,
      bankAccountId,
      bankName,
      notes,
    } = body;

    if (!agency) {
      return NextResponse.json({ error: "Agency is required." }, { status: 400 });
    }
    if (!periodMonth || !periodYear) {
      return NextResponse.json({ error: "Period month and year are required." }, { status: 400 });
    }

    const record = await tagStatutoryPayment({
      companyId: ctx.companyId,
      agency,
      payrollRunId,
      periodMonth: Number(periodMonth),
      periodYear: Number(periodYear),
      computedEeAmount: computedEeAmount || 0,
      computedErAmount: computedErAmount || 0,
      computedTotalAmount: computedTotalAmount || 0,
      status,
      paidAmount,
      paymentDate,
      paymentMethod,
      checkNumber,
      referenceNumber,
      bankAccountId,
      bankName,
      notes,
      taggedByUserId: ctx.userId,
    });

    return NextResponse.json({ record });
  } catch (err) {
    return mutationErrorResponse(err);
  }
}
