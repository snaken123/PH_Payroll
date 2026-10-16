import { prisma } from "@/lib/db";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";
import { ReportsManager } from "@/components/reports/reports-manager";
import { ReportsTabsClient } from "@/components/reports/reports-tabs-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CompanyRole, EmploymentStatus } from "@/lib/generated/prisma/enums";
import { PageHeader } from "@/components/ui/page-header";
import { FileTextIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  PAYSLIP: "Payslip PDF",
  PAYROLL_REGISTER: "Payroll Register PDF",
  SSS_R3: "SSS R-3 Contribution Report",
  PHILHEALTH_RF1: "PhilHealth RF-1 Remittance Report",
  PAGIBIG_MCRF: "Pag-IBIG MCRF Member Remittance",
  FORM_1601C: "BIR Form 1601-C Monthly Remittance",
  FORM_2316: "BIR Form 2316 Certificate of Tax Withheld",
  THIRTEENTH_MONTH_REPORT: "13th Month Pay Accrual Report",
  BIR_ALPHALIST: "BIR Alphalist (1604-C Schedule)",
  BANK_DISBURSEMENT: "Bank Disbursement Advice File",
};

export default async function ReportsPage() {
  const ctx = await getTenantContext();
  if (!hasPermission(ctx.permissions, "reports.view", ctx.platformRole)) {
    redirect("/dashboard");
  }

  const [postedRuns, employees, recentDocuments, bankAccounts] = await Promise.all([
    prisma.payrollRun.findMany({
      where: { companyId: ctx.companyId, status: "POSTED" },
      include: { payrollPeriod: true },
      orderBy: { runNumber: "desc" },
    }),
    prisma.employee.findMany({
      where: withCompanyScope(ctx.companyId, {
        employmentStatus: { in: [EmploymentStatus.PROBATIONARY, EmploymentStatus.REGULAR, EmploymentStatus.RETAINER] },
        isDeleted: false,
      }),
      select: { id: true, employeeNumber: true, firstName: true, lastName: true },
      orderBy: { lastName: "asc" },
    }),
    prisma.generatedDocument.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { generatedAt: "desc" },
      take: 20,
    }),
    prisma.companyBankAccount.findMany({
      where: { companyId: ctx.companyId },
      select: { id: true, bankName: true, accountNumber: true, nickname: true },
      orderBy: { isDefault: "desc" },
    }),
  ]);

  const canManagePayments =
    ctx.isSuperAdmin ||
    ctx.companyRole === CompanyRole.COMPANY_OWNER ||
    ctx.companyRole === CompanyRole.PAYROLL_ADMIN ||
    hasPermission(ctx.permissions, "payroll.post", ctx.platformRole);

  const officialReportsContent = (
    <div className="space-y-6">
      <ReportsManager
        postedRuns={postedRuns.map((r) => ({
          id: r.id,
          runNumber: r.runNumber,
          cutoffStart: r.payrollPeriod.cutoffStart.toLocaleDateString(),
          cutoffEnd: r.payrollPeriod.cutoffEnd.toLocaleDateString(),
        }))}
        employees={employees}
      />

      <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileTextIcon className="size-4 text-blue-600" /> Recently Generated Documents
          </CardTitle>
          <CardDescription className="text-xs">
            Audit history of generated statutory filings and payroll exports.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {recentDocuments.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">No reports generated yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 dark:bg-slate-900/80">
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Document Type</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Generated Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentDocuments.map((d) => (
                  <TableRow key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <TableCell className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      {DOCUMENT_TYPE_LABELS[d.documentType] ?? d.documentType}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                      {d.generatedAt.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statutory Contributions &amp; Government Reports"
        description="Track company statutory remittances to SSS, PhilHealth, Pag-IBIG, and BIR, tag payment details, and generate official compliance returns."
      />

      <ReportsTabsClient
        officialReportsContent={officialReportsContent}
        companyBankAccounts={bankAccounts}
        canManage={canManagePayments}
      />
    </div>
  );
}
