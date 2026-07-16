import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantRole, withCompanyScope } from "@/lib/db/scoped";
import { createLeaveRequestSchema, countLeaveDays } from "@/lib/validations/leave";
import { CompanyRole } from "@/lib/generated/prisma/enums";

const MANAGE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

export async function GET(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const employeeId = url.searchParams.get("employeeId");

  const requests = await prisma.leaveRequest.findMany({
    where: {
      employee: withCompanyScope(ctx.companyId),
      ...(employeeId ? { employeeId } : {}),
    },
    include: {
      employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
      leaveType: { select: { name: true, isPaid: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createLeaveRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const employee = await prisma.employee.findFirst({
    where: withCompanyScope(ctx.companyId, { id: data.employeeId }),
  });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const leaveType = await prisma.leaveType.findFirst({
    where: withCompanyScope(ctx.companyId, { id: data.leaveTypeId }),
  });
  if (!leaveType) return NextResponse.json({ error: "Leave type not found" }, { status: 404 });

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  if (endDate < startDate) {
    return NextResponse.json({ error: "End date must be on or after start date" }, { status: 400 });
  }
  const daysCount = countLeaveDays(startDate, endDate);

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      employeeId: data.employeeId,
      leaveTypeId: data.leaveTypeId,
      startDate,
      endDate,
      daysCount,
      reason: data.reason || null,
      status: "PENDING",
    },
  });

  return NextResponse.json({ leaveRequest }, { status: 201 });
}
