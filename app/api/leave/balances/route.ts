import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantRole, withCompanyScope } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";

const VIEW_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

export async function GET(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(VIEW_ROLES, { permissionKey: ["leave.view", "leave.manage"] });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const employeeId = url.searchParams.get("employeeId");
  if (!employeeId) {
    return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
  }

  const employee = await prisma.employee.findFirst({
    where: withCompanyScope(ctx.companyId, { id: employeeId, isDeleted: false }),
  });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const balances = await prisma.leaveBalance.findMany({
    where: { employeeId, year: new Date().getFullYear() },
    include: { leaveType: true },
  });

  return NextResponse.json({ balances });
}

export async function PATCH(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(VIEW_ROLES, { permissionKey: "leave.manage" });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { balanceId, entitledDays, adjustedDays } = body;
  if (!balanceId) {
    return NextResponse.json({ error: "balanceId is required" }, { status: 400 });
  }

  const balance = await prisma.leaveBalance.findUnique({
    where: { id: balanceId },
    include: { employee: true },
  });

  if (!balance || balance.employee.companyId !== ctx.companyId) {
    return NextResponse.json({ error: "Leave balance not found" }, { status: 404 });
  }

  const updateData: { entitledDays?: number; adjustedDays?: number } = {};
  if (entitledDays !== undefined) updateData.entitledDays = Number(entitledDays);
  if (adjustedDays !== undefined) updateData.adjustedDays = Number(adjustedDays);

  const updated = await prisma.leaveBalance.update({
    where: { id: balanceId },
    data: updateData,
    include: { leaveType: true },
  });

  return NextResponse.json({ balance: updated });
}
