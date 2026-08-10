import { NextResponse } from "next/server";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { getBankDisbursementData } from "@/lib/reports/queries";

const VIEW_ROLES = [
  CompanyRole.COMPANY_OWNER,
  CompanyRole.PAYROLL_ADMIN,
  CompanyRole.HR_STAFF,
];

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> }
) {
  let ctx;
  try {
    ctx = await requireTenantRole(VIEW_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { runId } = await context.params;

  try {
    const data = await getBankDisbursementData(ctx.companyId, runId);

    const csvHeaders = [
      "Seq",
      "Employee Number",
      "Employee Name",
      "Receiving Bank",
      "Employee Account Number",
      "Disbursing Company Bank",
      "Net Payout Amount (PHP)",
    ];

    const csvRows = data.rows.map((r, idx) => [
      idx + 1,
      `"${r.employeeNumber}"`,
      `"${r.employeeName.replace(/"/g, '""')}"`,
      `"${r.bankName}"`,
      `"${r.accountNumber}"`,
      `"${r.disbursingBankName}"`,
      r.netPay,
    ]);

    const csvContent = [csvHeaders.join(","), ...csvRows.map((row) => row.join(","))].join("\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bank_advice_run_${data.runNumber}.csv"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate CSV bank advice";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
