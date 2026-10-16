import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { assertCompanyId, getTenantContext } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { hasPermission } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RunActions } from "@/components/payroll/run-actions";
import { RunChecksSection } from "@/components/payroll/run-checks-section";
import { PayslipDetailDialog } from "@/components/payroll/payslip-detail-dialog";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricCard } from "@/components/ui/metric-card";
import { ArrowLeftIcon, DownloadIcon, WalletIcon, UsersIcon, ShieldCheckIcon, BanknoteIcon } from "lucide-react";

export default async function PayrollRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getTenantContext();

  const run = await prisma.payrollRun.findUnique({
    where: { id },
    include: {
      payrollPeriod: true,
      payslips: {
        include: {
          employee: { select: { employeeNumber: true, firstName: true, lastName: true } },
          lineItems: true,
        },
        orderBy: { employee: { lastName: "asc" } },
      },
    },
  });

  if (!run) notFound();
  try {
    assertCompanyId(ctx, run.companyId);
  } catch {
    notFound();
  }

  const totalGross = run.payslips.reduce((sum, p) => sum + Number(p.grossPay), 0);
  const totalStatutory = run.payslips.reduce((sum, p) => sum + Number(p.totalStatutoryDeductions), 0);
  const totalOther = run.payslips.reduce((sum, p) => sum + Number(p.totalOtherDeductions), 0);
  const totalNet = run.payslips.reduce((sum, p) => sum + Number(p.netPay), 0);

  const [companyBankAccounts] = await Promise.all([
    prisma.companyBankAccount.findMany({
      where: { companyId: run.companyId },
      select: { id: true, bankName: true, accountNumber: true, nickname: true },
      orderBy: { isDefault: "desc" },
    }),
  ]);

  const canApprovePayroll =
    ctx.isSuperAdmin ||
    ctx.companyRole === CompanyRole.COMPANY_OWNER ||
    hasPermission(ctx.permissions, "payroll.approve", ctx.platformRole);

  const canPostPayroll =
    ctx.isSuperAdmin ||
    ctx.companyRole === CompanyRole.COMPANY_OWNER ||
    hasPermission(ctx.permissions, "payroll.post", ctx.platformRole);

  const canManageChecks =
    ctx.isSuperAdmin ||
    ctx.companyRole === CompanyRole.COMPANY_OWNER ||
    ctx.companyRole === CompanyRole.PAYROLL_ADMIN ||
    hasPermission(ctx.permissions, "payroll.post", ctx.platformRole);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/payroll"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeftIcon className="size-3.5" /> Back to Payroll History
        </Link>
      </div>

      <PageHeader
        title={`Payroll Run #${run.runNumber}`}
        description={`Cutoff: ${run.payrollPeriod.cutoffStart.toLocaleDateString()} – ${run.payrollPeriod.cutoffEnd.toLocaleDateString()} · Pay Date: ${run.payrollPeriod.payDate.toLocaleDateString()}`}
        actions={
          <>
            <StatusBadge status={run.status} />
            {run.status === "POSTED" && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold" render={<a href={`/api/reports/payroll-register/${run.id}`} target="_blank" />}>
                <DownloadIcon className="size-3.5" /> Register PDF
              </Button>
            )}
            <RunActions
              runId={run.id}
              status={run.status}
              cutoffStart={run.payrollPeriod.cutoffStart}
              cutoffEnd={run.payrollPeriod.cutoffEnd}
              canApprove={canApprovePayroll}
              canPost={canPostPayroll}
            />
          </>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Net Pay"
          value={`₱${totalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          subtitle={`Across ${run.payslips.length} payslips`}
          icon={WalletIcon}
        />
        <MetricCard
          title="Total Gross Pay"
          value={`₱${totalGross.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          subtitle="Basic pay + earnings"
          icon={BanknoteIcon}
        />
        <MetricCard
          title="Statutory Deductions"
          value={`₱${totalStatutory.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          subtitle="SSS + PhilHealth + Pag-IBIG + Tax"
          icon={ShieldCheckIcon}
        />
        <MetricCard
          title="Employee Count"
          value={run.payslips.length}
          subtitle="Processed in this cutoff"
          icon={UsersIcon}
        />
      </div>

      {run.status === "POSTED" && (
        <RunChecksSection
          runId={run.id}
          runNumber={run.runNumber}
          totalNetPay={totalNet}
          payDate={run.payrollPeriod.payDate.toISOString().slice(0, 10)}
          companyBankAccounts={companyBankAccounts}
          canManage={canManageChecks}
        />
      )}

      {/* Payslips Table Card */}
      <Card className="border-slate-200/90 shadow-xs dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Cutoff Payslips Register ({run.payslips.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Itemized employee earnings, statutory deductions, loan repayments, and net pay.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {run.payslips.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 max-w-lg mx-auto text-sm space-y-2">
                <p className="font-semibold">Why are there 0 payslips in this run?</p>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  No active employees with compensation records effective on or before {run.payrollPeriod.cutoffEnd.toLocaleDateString()} were found.
                </p>
                <div className="pt-1 flex items-center justify-center gap-3">
                  <Button size="sm" variant="outline" render={<Link href="/dashboard/employees" />}>
                    Go to Employee Directory &rarr;
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800">
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Employee Name</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Gross Pay</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Statutory Deductions</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Loans &amp; Other</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Net Pay</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Payslip Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {run.payslips.map((p) => {
                  const employeeName = `${p.employee.lastName}, ${p.employee.firstName} (${p.employee.employeeNumber})`;
                  return (
                    <TableRow key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="size-6 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                            {p.employee.firstName.charAt(0)}{p.employee.lastName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                              {p.employee.lastName}, {p.employee.firstName}
                            </span>{" "}
                            <span className="font-mono text-[11px] text-slate-400 font-normal">({p.employee.employeeNumber})</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs font-medium text-slate-800 dark:text-slate-200">
                        ₱{Number(p.grossPay).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400">
                        ₱{Number(p.totalStatutoryDeductions).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400">
                        ₱{Number(p.totalOtherDeductions).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums font-bold text-xs text-slate-900 dark:text-slate-100">
                        ₱{Number(p.netPay).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right py-1">
                        <PayslipDetailDialog
                          payslipId={p.id}
                          employeeName={employeeName}
                          netPay={p.netPay.toString()}
                          lineItems={p.lineItems.map((li) => ({
                            id: li.id,
                            category: li.category,
                            direction: li.direction,
                            description: li.description,
                            amount: li.amount.toString(),
                          }))}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-slate-50/90 dark:bg-slate-900/90 font-bold border-t-2 border-slate-200/90 dark:border-slate-800">
                  <TableCell className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Total Register ({run.payslips.length} Employees)
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-slate-900 dark:text-slate-100">
                    ₱{totalGross.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-slate-900 dark:text-slate-100">
                    ₱{totalStatutory.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-slate-900 dark:text-slate-100">
                    ₱{totalOther.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-blue-700 dark:text-blue-400">
                    ₱{totalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right" />
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
