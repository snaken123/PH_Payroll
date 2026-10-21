import { NextResponse } from "next/server";
import { requireRemittanceAccess } from "@/lib/auth";
import {
  getConsolidatedPayables,
  type ConsolidatedRemittanceFilters,
} from "@/lib/services/remittanceConsolidationService";
import { StatutoryAgency, StatutoryPaymentStatus } from "@/lib/generated/prisma/enums";

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

    const itemTypeParam = searchParams.get("itemType");
    const itemType =
      itemTypeParam === "CONTRIBUTION" || itemTypeParam === "LOAN" ? itemTypeParam : "ALL";

    const statusParam = searchParams.get("status");
    const status =
      statusParam && Object.values(StatutoryPaymentStatus).includes(statusParam as StatutoryPaymentStatus)
        ? (statusParam as StatutoryPaymentStatus)
        : undefined;

    const yearParam = searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : undefined;

    const monthParam = searchParams.get("month");
    const month = monthParam ? parseInt(monthParam, 10) : undefined;

    const search = searchParams.get("search") || undefined;

    const filters: ConsolidatedRemittanceFilters = {
      companyId,
      agency,
      itemType,
      status,
      year: year && !isNaN(year) ? year : undefined,
      month: month && !isNaN(month) ? month : undefined,
      search,
    };

    const data = await getConsolidatedPayables(filters);

    return NextResponse.json(data);
  } catch (err: any) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden: Remittance Access required" }, { status: 403 });
    }
    console.error("Error fetching consolidated payables:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch consolidated payables" },
      { status: 500 }
    );
  }
}
