import { NextResponse } from "next/server";
import { assertCompanyId, requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { createPayrollCheck, getPayrollRunChecks } from "@/lib/services/checkService";
import { mutationErrorResponse } from "@/lib/api-error";

const CHECK_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(CHECK_ROLES, { permissionKey: ["payroll.compute", "payroll.post"] });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const run = await prisma.payrollRun.findUnique({
    where: { id },
    select: { companyId: true },
  });

  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  try {
    assertCompanyId(ctx, run.companyId);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const checks = await getPayrollRunChecks(ctx.companyId, id);
    return NextResponse.json({ checks });
  } catch (err) {
    return mutationErrorResponse(err);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(CHECK_ROLES, { permissionKey: "payroll.post" });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const run = await prisma.payrollRun.findUnique({
    where: { id },
    include: { payrollPeriod: true },
  });

  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  try {
    assertCompanyId(ctx, run.companyId);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (run.status !== "POSTED") {
    return NextResponse.json(
      { error: "Checks can only be recorded after the payroll run is posted." },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { checkNumber, checkDate, amount, bankAccountId, bankName, payee, notes, status } = body;

    if (!checkNumber || !checkNumber.trim()) {
      return NextResponse.json({ error: "Check number is required." }, { status: 400 });
    }
    if (!checkDate) {
      return NextResponse.json({ error: "Check date is required." }, { status: 400 });
    }
    if (amount === undefined || amount === null || Number(amount) < 0) {
      return NextResponse.json({ error: "Valid amount is required." }, { status: 400 });
    }

    const check = await createPayrollCheck({
      companyId: ctx.companyId,
      payrollRunId: id,
      checkNumber,
      checkDate,
      amount,
      bankAccountId,
      bankName,
      payee,
      notes,
      status: status || "ISSUED",
      issuedByUserId: ctx.userId,
    });

    return NextResponse.json({ check }, { status: 201 });
  } catch (err) {
    return mutationErrorResponse(err);
  }
}
