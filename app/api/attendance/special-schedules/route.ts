import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/db/scoped";
import { hasPermission } from "@/lib/permissions";
import { z } from "zod";

const specialScheduleSchema = z.object({
  workDate: z.string().min(1, "Work Date is required"),
  title: z.string().min(1, "Title / Occasion is required"),
  standardTimeIn: z.string().min(1, "Time-In is required"),
  standardTimeOut: z.string().optional().nullable(),
  lunchBreakMinutes: z.number().int().min(0).max(480).default(60),
  lateGracePeriodMinutes: z.number().int().min(0).max(120).default(15),
  otGracePeriodMinutes: z.number().int().min(0).max(120).default(15),
  appliesToAllEmployees: z.boolean().default(true),
  employeeIds: z.array(z.string()).optional().nullable(),
});

export async function GET() {
  try {
    const ctx = await getTenantContext();
    const schedules = await prisma.specialDaySchedule.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { workDate: "desc" },
    });
    return NextResponse.json({ schedules });
  } catch (error) {
    console.error("Error fetching special schedules:", error);
    return NextResponse.json({ error: "Failed to fetch special schedules" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getTenantContext();
    const canManage =
      ctx.isSuperAdmin ||
      ctx.companyRole === "COMPANY_OWNER" ||
      hasPermission(ctx.permissions, "attendance.manage", ctx.platformRole);

    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = specialScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const workDate = new Date(data.workDate + "T00:00:00.000Z");

    const schedule = await prisma.specialDaySchedule.upsert({
      where: {
        companyId_workDate: {
          companyId: ctx.companyId,
          workDate,
        },
      },
      update: {
        title: data.title,
        standardTimeIn: data.standardTimeIn,
        standardTimeOut: data.standardTimeOut || null,
        lunchBreakMinutes: data.lunchBreakMinutes,
        lateGracePeriodMinutes: data.lateGracePeriodMinutes,
        otGracePeriodMinutes: data.otGracePeriodMinutes,
        appliesToAllEmployees: data.appliesToAllEmployees,
        employeeIds: data.employeeIds ?? undefined,
      },
      create: {
        companyId: ctx.companyId,
        workDate,
        title: data.title,
        standardTimeIn: data.standardTimeIn,
        standardTimeOut: data.standardTimeOut || null,
        lunchBreakMinutes: data.lunchBreakMinutes,
        lateGracePeriodMinutes: data.lateGracePeriodMinutes,
        otGracePeriodMinutes: data.otGracePeriodMinutes,
        appliesToAllEmployees: data.appliesToAllEmployees,
        employeeIds: data.employeeIds ?? undefined,
      },
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    console.error("Error creating special schedule:", error);
    return NextResponse.json({ error: "Failed to save special schedule" }, { status: 500 });
  }
}
