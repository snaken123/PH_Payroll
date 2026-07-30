import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantRole, withCompanyScope } from "@/lib/db/scoped";
import { createLoanSchema } from "@/lib/validations/loan";
import { CompanyRole, LoanCategory, LoanStatus } from "@/lib/generated/prisma/enums";

const MANAGE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

export async function GET(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const employeeId = url.searchParams.get("employeeId");

  const loans = await prisma.loan.findMany({
    where: withCompanyScope(ctx.companyId, employeeId ? { employeeId } : {}),
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json({ loans });
}

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createLoanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const employee = await prisma.employee.findFirst({
    where: withCompanyScope(ctx.companyId, { id: data.employeeId }),
  });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  // Cash advances go through a manager approval step before any deduction
  // can happen; every other loan category is recorded as an already-agreed
  // fact (e.g. an existing SSS loan being tracked) and starts ACTIVE.
  const status = data.category === LoanCategory.CASH_ADVANCE ? LoanStatus.PENDING_APPROVAL : LoanStatus.ACTIVE;

  const loan = await prisma.loan.create({
    data: {
      companyId: ctx.companyId,
      employeeId: data.employeeId,
      category: data.category,
      name: data.name,
      principal: data.principal,
      termMonths: data.termMonths ?? null,
      installmentAmount: data.installmentAmount,
      deductionFrequency: data.deductionFrequency,
      startDate: new Date(data.startDate),
      referenceNumber: data.referenceNumber || null,
      remainingBalance: data.principal,
      status,
    },
  });

  return NextResponse.json({ loan }, { status: 201 });
}
