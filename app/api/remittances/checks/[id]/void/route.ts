import { NextResponse } from "next/server";
import { requireRemittanceAccess } from "@/lib/auth";
import { voidRemittanceCheck } from "@/lib/services/remittanceConsolidationService";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRemittanceAccess();
    const { id } = await params;

    const check = await voidRemittanceCheck(id);

    return NextResponse.json({ success: true, check });
  } catch (err: any) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden: Remittance Access required" }, { status: 403 });
    }
    console.error("Error voiding remittance check:", err);
    return NextResponse.json(
      { error: err.message || "Failed to void remittance check" },
      { status: 400 }
    );
  }
}
