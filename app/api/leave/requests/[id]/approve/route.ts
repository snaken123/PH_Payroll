import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";

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

    for (
      let d = new Date(leaveRequest.startDate);
      d <= leaveRequest.endDate;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      if (d.getUTCDay() === 0) continue; // Sunday — not a workday, nothing to mark

      const workDate = new Date(d);
      await tx.timesheetEntry.upsert({
        where: { employeeId_workDate: { employeeId: leaveRequest.employeeId, workDate } },
        update: {
          status: "LEAVE",
          regularHours: leaveRequest.leaveType.isPaid ? 8 : 0,
          holidayType: null,
          isRestDay: false,
        },
        create: {
          companyId: ctx.companyId,
          employeeId: leaveRequest.employeeId,
          workDate,
          status: "LEAVE",
          scheduledHours: 8,
          regularHours: leaveRequest.leaveType.isPaid ? 8 : 0,
          source: "MANUAL",
        },
      });
    }
  });

  return NextResponse.json({ success: true });
}
