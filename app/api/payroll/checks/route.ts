import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { listCompanyChecks, createPayrollCheck } from "@/lib/services/checkService";
import { mutationErrorResponse } from "@/lib/api-error";

const VIEW_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.APPROVER];
const MANAGE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

export async function GET(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(VIEW_ROLES, {
      permissionKey: ["payroll.compute", "payroll.post", "reports.view"],
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;
  const status = searchParams.get("status") || undefined;
  const sourceType = searchParams.get("sourceType") || undefined;
  const payrollRunId = searchParams.get("payrollRunId") || undefined;
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");
  const take = searchParams.get("take") ? parseInt(searchParams.get("take")!, 10) : 50;
  const skip = searchParams.get("skip") ? parseInt(searchParams.get("skip")!, 10) : 0;

  const startDate = startDateStr ? new Date(startDateStr) : undefined;
  const endDate = endDateStr ? new Date(endDateStr) : undefined;

  try {
    const [result, bankAccounts, postedRuns] = await Promise.all([
      listCompanyChecks(ctx.companyId, {
        search,
        status,
        sourceType,
        payrollRunId,
        startDate,
        endDate,
        take,
        skip,
      }),
      prisma.companyBankAccount.findMany({
        where: { companyId: ctx.companyId },
        select: { id: true, bankName: true, accountNumber: true, nickname: true },
        orderBy: [{ isDefault: "desc" }, { bankName: "asc" }],
      }),
      prisma.payrollRun.findMany({
        where: { companyId: ctx.companyId, status: "POSTED" },
        include: {
          payrollPeriod: true,
          payslips: {
            select: { netPay: true },
          },
          paymentChecks: {
            where: { status: { not: "VOID" } },
            select: { id: true, checkNumber: true },
          },
        },
        orderBy: { runNumber: "desc" },
      }),
    ]);

    const availablePostedRuns = postedRuns.map((r) => {
      const totalNetPay = r.payslips.reduce((sum, p) => sum + p.netPay.toNumber(), 0);
      return {
        id: r.id,
        runNumber: r.runNumber,
        cutoffStart: r.payrollPeriod.cutoffStart.toISOString().slice(0, 10),
        cutoffEnd: r.payrollPeriod.cutoffEnd.toISOString().slice(0, 10),
        payDate: r.payrollPeriod.payDate.toISOString().slice(0, 10),
        netPay: Number(totalNetPay.toFixed(2)),
        hasCheck: r.paymentChecks.length > 0,
        checksCount: r.paymentChecks.length,
      };
    });

    return NextResponse.json({
      ...result,
      companyBankAccounts: bankAccounts,
      availablePostedRuns,
    });
  } catch (err) {
    return mutationErrorResponse(err);
  }
}

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES, {
      permissionKey: "payroll.post",
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const check = await createPayrollCheck({
      companyId: ctx.companyId,
      ...body,
      issuedByUserId: ctx.userId,
    });
    return NextResponse.json({ check }, { status: 201 });
  } catch (err) {
    return mutationErrorResponse(err);
  }
}
