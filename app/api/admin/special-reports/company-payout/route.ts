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

  let companyIds: string[] | undefined;
  if (rawCompanyIds) {
    companyIds = rawCompanyIds.split(",").map((s) => s.trim()).filter(Boolean);
  }

  const result = await generateCompanyPayoutReport({
    selectedRunId,
    companyIds,
  });

  return NextResponse.json(result);
}
