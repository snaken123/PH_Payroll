import { NextResponse } from "next/server";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { getCompanyContributionsSummary } from "@/lib/services/statutoryPaymentService";
import { mutationErrorResponse } from "@/lib/api-error";

const VIEW_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.APPROVER];

export async function GET(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(VIEW_ROLES, {
      permissionKey: ["reports.view", "payroll.compute", "payroll.post"],
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const payrollRunId = searchParams.get("payrollRunId") || undefined;
  const yearStr = searchParams.get("year");
  const monthStr = searchParams.get("month");

  const year = yearStr ? parseInt(yearStr, 10) : undefined;
  const month = monthStr ? parseInt(monthStr, 10) : undefined;

  try {
    const summary = await getCompanyContributionsSummary(ctx.companyId, {
      payrollRunId,
      year,
      month,
    });

    return NextResponse.json(summary);
  } catch (err) {
    return mutationErrorResponse(err);
  }
}
