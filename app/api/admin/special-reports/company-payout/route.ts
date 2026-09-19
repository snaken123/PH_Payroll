import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { generateCompanyPayoutReport } from "@/lib/reports/companyPayoutReport";

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session || session.user.platformRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const selectedRunId = searchParams.get("runId") || "ALL";
  const rawCompanyIds = searchParams.get("companyIds");
  const rawEmployeeIds = searchParams.get("employeeIds");

  let companyIds: string[] | undefined;
  if (rawCompanyIds) {
    companyIds = rawCompanyIds.split(",").map((s) => s.trim()).filter(Boolean);
  }

  let employeeIds: string[] | undefined;
  if (rawEmployeeIds) {
    employeeIds = rawEmployeeIds.split(",").map((s) => s.trim()).filter(Boolean);
  }

  const result = await generateCompanyPayoutReport({
    selectedRunId,
    companyIds,
    employeeIds,
  });

  return NextResponse.json(result);
}
