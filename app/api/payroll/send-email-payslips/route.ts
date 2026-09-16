import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole, PayrollRunStatus } from "@/lib/generated/prisma/enums";
import { getPayslipReportData } from "@/lib/reports/queries";
import { PayslipDocument } from "@/lib/reports/documents/PayslipDocument";
import { renderToBuffer } from "@react-pdf/renderer";
import { sendResendEmail } from "@/lib/email/resend";
import { generatePayslipHtml } from "@/lib/email/payslipEmailTemplate";

const MANAGE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { payrollRunId, employeeIds } = body as { payrollRunId?: string; employeeIds?: string[] };

  if (!payrollRunId || !Array.isArray(employeeIds) || employeeIds.length === 0) {
    return NextResponse.json({ error: "Please select a valid payroll run and at least one employee." }, { status: 400 });
  }

  const run = await prisma.payrollRun.findFirst({
    where: {
      id: payrollRunId,
      companyId: ctx.companyId,
      status: { in: [PayrollRunStatus.APPROVED, PayrollRunStatus.POSTED] },
    },
    include: {
      company: true,
      payrollPeriod: true,
      payslips: {
        where: { employeeId: { in: employeeIds } },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true,
              personalEmail: true,
              user: { select: { email: true } },
            },
          },
          lineItems: true,
        },
      },
    },
  });

  if (!run) {
    return NextResponse.json(
      { error: "Selected payroll run is either not found or not in APPROVED/POSTED status." },
      { status: 404 }
    );
  }

  let sentCount = 0;
  let failedCount = 0;
  const results: { employeeId: string; employeeName: string; email: string | null; success: boolean; error?: string; simulated?: boolean }[] = [];

  for (const payslip of run.payslips) {
    const employee = payslip.employee;
    const employeeName = `${employee.lastName}, ${employee.firstName}`;
    const email = employee.personalEmail?.trim() || employee.user?.email?.trim() || null;

    if (!email) {
      failedCount++;
      results.push({
        employeeId: employee.id,
        employeeName,
        email: null,
        success: false,
        error: "Missing email address",
      });
      continue;
    }

    try {
      // 1. Calculate line item totals for HTML template
      const getCategoryTotal = (cat: string) =>
        payslip.lineItems
          .filter((li) => li.category === cat)
          .reduce((sum, li) => sum + li.amount.toNumber(), 0);

      const basicPay = getCategoryTotal("BASIC_PAY");
      const sssDeduction = getCategoryTotal("SSS_EE");
      const philhealthDeduction = getCategoryTotal("PHILHEALTH_EE");
      const pagibigDeduction = getCategoryTotal("PAGIBIG_EE");
      const withholdingTax = getCategoryTotal("WITHHOLDING_TAX");

      const allowancesTotal = payslip.lineItems
        .filter((li) => li.category.includes("ALLOWANCE") || li.category.includes("DE_MINIMIS"))
        .reduce((sum, li) => sum + li.amount.toNumber(), 0);

      const overtimeTotal = payslip.lineItems
        .filter((li) => li.category.includes("OVERTIME") || li.category.includes("NIGHT") || li.category.includes("HOLIDAY"))
        .reduce((sum, li) => sum + li.amount.toNumber(), 0);

      const loansTotal = payslip.lineItems
        .filter((li) => li.category.includes("LOAN") || li.category.includes("ADVANCE"))
        .reduce((sum, li) => sum + li.amount.toNumber(), 0);

      const htmlBody = generatePayslipHtml({
        companyName: run.company.legalName,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        employeeNumber: employee.employeeNumber,
        periodStart: run.payrollPeriod.cutoffStart.toISOString().slice(0, 10),
        periodEnd: run.payrollPeriod.cutoffEnd.toISOString().slice(0, 10),
        payDate: run.payrollPeriod.payDate.toISOString().slice(0, 10),
        basicPay,
        grossPay: payslip.grossPay.toNumber(),
        netPay: payslip.netPay.toNumber(),
        totalDeductions: payslip.totalStatutoryDeductions.add(payslip.totalOtherDeductions).toNumber(),
        sssDeduction,
        philhealthDeduction,
        pagibigDeduction,
        withholdingTax,
        allowancesTotal,
        overtimeTotal,
        loansTotal,
      });

      // 2. Generate PDF Payslip Buffer
      let pdfBase64: string | undefined;
      try {
        const reportData = await getPayslipReportData(ctx.companyId, payslip.id);
        const pdfBuffer = await renderToBuffer(PayslipDocument({ data: reportData }));
        pdfBase64 = Buffer.from(pdfBuffer).toString("base64");
      } catch (pdfErr) {
        console.warn(`Could not render PDF attachment for payslip ${payslip.id}:`, pdfErr);
      }

      // 3. Send via Resend
      const attachments = pdfBase64
        ? [
            {
              filename: `Payslip_${employee.employeeNumber}_${run.payrollPeriod.payDate.toISOString().slice(0, 10)}.pdf`,
              content: pdfBase64,
            },
          ]
        : undefined;

      const emailResult = await sendResendEmail({
        to: email,
        subject: `Payslip for ${run.payrollPeriod.cutoffStart.toISOString().slice(0, 10)} - ${run.payrollPeriod.cutoffEnd.toISOString().slice(0, 10)} | ${run.company.legalName}`,
        html: htmlBody,
        attachments,
      });

      if (emailResult.success) {
        sentCount++;
        results.push({
          employeeId: employee.id,
          employeeName,
          email,
          success: true,
          simulated: emailResult.simulated,
        });
      } else {
        failedCount++;
        results.push({
          employeeId: employee.id,
          employeeName,
          email,
          success: false,
          error: emailResult.error || "Email delivery failed",
        });
      }
    } catch (err: unknown) {
      failedCount++;
      const message = err instanceof Error ? err.message : "Error processing email";
      results.push({
        employeeId: employee.id,
        employeeName,
        email,
        success: false,
        error: message,
      });
    }
  }

  return NextResponse.json({
    success: true,
    sentCount,
    failedCount,
    totalProcessed: run.payslips.length,
    results,
  });
}
