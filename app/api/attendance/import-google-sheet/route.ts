import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/db/scoped";
import { hasPermission } from "@/lib/permissions";
import { fetchGoogleSheetAndProcess } from "@/lib/services/googleSheetAttendanceService";

export async function POST(req: Request) {
  try {
    const ctx = await getTenantContext();

    const canManageAttendance =
      ctx.isSuperAdmin ||
      ctx.companyRole === "COMPANY_OWNER" ||
      hasPermission(ctx.permissions, "attendance.manage", ctx.platformRole);

    if (!canManageAttendance) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to manage attendance records." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { url, start, end, autoSave = true } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "Please provide a valid Google Spreadsheet URL." },
        { status: 400 }
      );
    }

    if (!start || !end) {
      return NextResponse.json(
        { success: false, error: "Start date and End date are required for attendance import." },
        { status: 400 }
      );
    }

    const result = await fetchGoogleSheetAndProcess({
      url,
      companyId: ctx.companyId,
      start,
      end,
      autoSave: Boolean(autoSave),
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Google Sheet attendance import error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process Google Spreadsheet attendance.",
      },
      { status: 400 }
    );
  }
}
