import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { mutationErrorResponse } from "@/lib/api-error";

const APPROVE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

// Approving a leave request upserts TimesheetEntry rows (status=LEAVE) across
// the date range and increments the matching LeaveBalance.usedDays — this is
// what makes approved leave suppress an "absent" deduction in payroll,
// closing the loop between the leave module and the Phase 2 attendance data.
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(APPROVE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: true, leaveType: true },
  });
  if (!leaveRequest) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (leaveRequest.employee.companyId !== ctx.companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (leaveRequest.status !== "PENDING") {
    return NextResponse.json(
      { error: `Cannot approve a request in ${leaveRequest.status} status` },
      { status: 409 }
    );
  }

  // Build the workday list first (pure computation), then batch the reads/writes
  // below instead of upserting one row per calendar day inside the transaction.
  const workDates: Date[] = [];
  for (
    let d = new Date(leaveRequest.startDate);
    d <= leaveRequest.endDate;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    if (d.getUTCDay() === 0) continue; // Sunday — not a workday, nothing to mark
    workDates.push(new Date(d));
  }
  const regularHoursIfLeave = leaveRequest.leaveType.isPaid ? 8 : 0;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.leaveRequest.update({
        where: { id },
        data: { status: "APPROVED", approvedAt: new Date(), approvedByUserId: ctx.userId },
      });

      await tx.leaveBalance.updateMany({
        where: {
          employeeId: leaveRequest.employeeId,
          leaveTypeId: leaveRequest.leaveTypeId,
          year: leaveRequest.startDate.getFullYear(),
        },
        data: { usedDays: { increment: leaveRequest.daysCount.toNumber() } },
      });

      if (workDates.length > 0) {
        const existingEntries = await tx.timesheetEntry.findMany({
          where: { employeeId: leaveRequest.employeeId, workDate: { in: workDates } },
          select: { workDate: true },
        });
        const existingDates = new Set(existingEntries.map((e) => e.workDate.getTime()));
        const datesToCreate = workDates.filter((d) => !existingDates.has(d.getTime()));
        const datesToUpdate = workDates.filter((d) => existingDates.has(d.getTime()));

        if (datesToCreate.length > 0) {
          await tx.timesheetEntry.createMany({
            data: datesToCreate.map((workDate) => ({
              companyId: ctx.companyId,
              employeeId: leaveRequest.employeeId,
              workDate,
              status: "LEAVE",
              scheduledHours: 8,
              regularHours: regularHoursIfLeave,
              source: "MANUAL",
            })),
          });
        }

        if (datesToUpdate.length > 0) {
          await tx.timesheetEntry.updateMany({
            where: { employeeId: leaveRequest.employeeId, workDate: { in: datesToUpdate } },
            data: { status: "LEAVE", regularHours: regularHoursIfLeave, holidayType: null, isRestDay: false },
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return mutationErrorResponse(err);
  }
}
