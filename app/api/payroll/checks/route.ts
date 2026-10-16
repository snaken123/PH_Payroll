import { NextResponse } from "next/server";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { listCompanyChecks } from "@/lib/services/checkService";
import { mutationErrorResponse } from "@/lib/api-error";

const VIEW_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.APPROVER];

export async function GET(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(VIEW_ROLES, {
      permissionKey: ["payroll.compute", "payroll.post", "reports.view"],
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;
  const status = searchParams.get("status") || undefined;
  const payrollRunId = searchParams.get("payrollRunId") || undefined;
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");
  const take = searchParams.get("take") ? parseInt(searchParams.get("take")!, 10) : 50;
  const skip = searchParams.get("skip") ? parseInt(searchParams.get("skip")!, 10) : 0;

  const startDate = startDateStr ? new Date(startDateStr) : undefined;
  const endDate = endDateStr ? new Date(endDateStr) : undefined;

  try {
    const result = await listCompanyChecks(ctx.companyId, {
      search,
      status,
      payrollRunId,
      startDate,
      endDate,
      take,
      skip,
    });

    return NextResponse.json(result);
  } catch (err) {
    return mutationErrorResponse(err);
  }
}
