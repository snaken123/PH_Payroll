import { NextResponse } from "next/server";
import { requireRemittanceAccess } from "@/lib/auth";
import { getRemittanceChecks } from "@/lib/services/remittanceConsolidationService";
import { StatutoryAgency } from "@/lib/generated/prisma/enums";

export async function GET(request: Request) {
  try {
    await requireRemittanceAccess();

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || undefined;
    const agencyParam = searchParams.get("agency");
    const agency =
      agencyParam && Object.values(StatutoryAgency).includes(agencyParam as StatutoryAgency)
        ? (agencyParam as StatutoryAgency)
        : undefined;

    const checks = await getRemittanceChecks({ companyId, agency });

    return NextResponse.json({ checks });
  } catch (err: any) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden: Remittance Access required" }, { status: 403 });
    }
    console.error("Error fetching remittance checks:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch remittance checks" },
      { status: 500 }
    );
  }
}
