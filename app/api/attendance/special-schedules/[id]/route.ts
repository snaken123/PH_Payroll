import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/db/scoped";
import { hasPermission } from "@/lib/permissions";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext();
    const canManage =
      ctx.isSuperAdmin ||
      ctx.companyRole === "COMPANY_OWNER" ||
      hasPermission(ctx.permissions, "attendance.manage", ctx.platformRole);

    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const existing = await prisma.specialDaySchedule.findUnique({
      where: { id },
    });

    if (!existing || existing.companyId !== ctx.companyId) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    await prisma.specialDaySchedule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting special schedule:", error);
    return NextResponse.json({ error: "Failed to delete schedule" }, { status: 500 });
  }
}
