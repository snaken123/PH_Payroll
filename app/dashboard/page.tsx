import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { LoanStatus } from "@/lib/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateRunDialog } from "@/components/payroll/create-run-dialog";
import { SendEmailPayslipsDialog } from "@/components/payroll/send-email-payslips-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  UsersIcon,
  Building2Icon,
  WalletIcon,
  BanknoteIcon,
  ArrowRightIcon,
  FileTextIcon,
  UserCheckIcon,
} from "lucide-react";

import { getSuperUserTodoList } from "@/lib/services/todoService";
import { SuperUserTodo } from "@/components/dashboard/super-user-todo";

export default async function DashboardPage() {
  const ctx = await getTenantContext();

  const canViewOverview = ctx.isSuperAdmin || hasPermission(ctx.permissions, "overview.view", ctx.platformRole);
  if (!canViewOverview) {
    if (hasPermission(ctx.permissions, "employee.view_info", ctx.platformRole)) {
      redirect("/dashboard/employees");
    } else if (hasPermission(ctx.permissions, "attendance.view", ctx.platformRole)) {
      redirect("/dashboard/attendance");
    } else if (hasPermission(ctx.permissions, "leave.view", ctx.platformRole)) {
      redirect("/dashboard/leave");
    } else if (hasPermission(ctx.permissions, "loans.view", ctx.platformRole)) {
      redirect("/dashboard/loans");
    } else if (hasPermission(ctx.permissions, "payroll.compute", ctx.platformRole)) {
      redirect("/dashboard/payroll");
    } else if (hasPermission(ctx.permissions, "reports.view", ctx.platformRole)) {
      redirect("/dashboard/reports");
    } else if (hasPermission(ctx.permissions, "contractors.view", ctx.platformRole)) {
      redirect("/dashboard/contractors");
    } else {
      redirect("/dashboard/my-pay");
    }
  }

  const canViewCompensation = ctx.isSuperAdmin || ctx.permissions.includes("employee.view_compensation");
  const canComputePayroll = ctx.isSuperAdmin || ctx.permissions.includes("payroll.compute");
  const canSendPayslips = ctx.isSuperAdmin || ctx.permissions.includes("payroll.send_payslips");
  const canViewReports = ctx.isSuperAdmin || ctx.permissions.includes("reports.view");
  const canViewLoans = ctx.isSuperAdmin || ctx.permissions.includes("loans.view");

  const [company, employeeCount, branchCount, activeLoansCount, latestRun, recentRuns, todoSummary] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: ctx.companyId } }),
    prisma.employee.count({ where: withCompanyScope(ctx.companyId, { isDeleted: false }) }),
    prisma.companyBranch.count({ where: withCompanyScope(ctx.companyId) }),
    prisma.loan.count({ where: withCompanyScope(ctx.companyId, { status: LoanStatus.ACTIVE }) }),
    prisma.payrollRun.findFirst({
      where: { companyId: ctx.companyId },
      include: { payrollPeriod: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payrollRun.findMany({
      where: { companyId: ctx.companyId },
      include: { payrollPeriod: true, _count: { select: { payslips: true } } },
      orderBy: { runNumber: "desc" },
      take: 5,
    }),
    getSuperUserTodoList(ctx.companyId),
  ]);

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Overview Page Header */}
      <PageHeader
        title={`Overview — ${company.legalName}`}
        description={`Philippine semi-monthly payroll & statutory compliance system. Active tenant: ${company.companyCode} · ${formattedDate}`}
        actions={
          <>
            {canSendPayslips && <SendEmailPayslipsDialog />}
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold" render={<Link href="/dashboard/employees" />}>
              <UsersIcon className="size-3.5 text-slate-500" />
              Employee Directory
            </Button>
            {canComputePayroll && <CreateRunDialog />}
          </>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Employees"
          value={employeeCount}
          subtitle="Active roster count"
          icon={UsersIcon}
        />
        <MetricCard
          title="Latest Run Status"
          value={canComputePayroll || canViewCompensation ? (latestRun ? `#${latestRun.runNumber}` : "No runs") : "••••••"}
          subtitle={
            canComputePayroll || canViewCompensation
              ? latestRun
                ? `Paid: ${new Date(latestRun.payrollPeriod.payDate).toLocaleDateString()}`
                : "Click Run Payroll to start"
              : "Restricted Access"
          }
          icon={WalletIcon}
          badge={latestRun && (canComputePayroll || canViewCompensation) ? <StatusBadge status={latestRun.status} /> : undefined}
        />
        <MetricCard
          title="Active Loans"
          value={canViewLoans ? activeLoansCount : "••••••"}
          subtitle={canViewLoans ? "Automated cutoff deductions" : "Restricted Access"}
          icon={BanknoteIcon}
        />
        <MetricCard
          title="Company Locations"
          value={branchCount}
          subtitle={`Head Office: ${company.region}`}
          icon={Building2Icon}
        />
      </div>

      {/* Super User To-Do List & Pending Approvals Widget */}
      {(canComputePayroll || canViewLoans || canViewCompensation || ctx.isSuperAdmin) && (
        <SuperUserTodo summary={todoSummary} />
      )}

      {/* Operational Modules Navigation Row */}
      <div className="grid gap-3.5 sm:grid-cols-3">
        {(canComputePayroll || canViewCompensation) && (
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-slate-700 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <WalletIcon className="size-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">Payroll Computation</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Calculate, review &amp; post runs</p>
              </div>
            </div>
            <Link
              href="/dashboard/payroll"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 shrink-0 ml-2"
            >
              Open <ArrowRightIcon className="size-3" />
            </Link>
          </div>
        )}

        {canViewReports && (
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-slate-700 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <FileTextIcon className="size-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">Statutory &amp; Tax Filings</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">BIR 1601-C, 2316, SSS &amp; PhilHealth</p>
              </div>
            </div>
            <Link
              href="/dashboard/reports"
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 shrink-0 ml-2"
            >
              Reports <ArrowRightIcon className="size-3" />
            </Link>
          </div>
        )}

        <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-slate-700 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <UserCheckIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">Employee Portal</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Self-service payslips &amp; records</p>
            </div>
          </div>
          <Link
            href="/dashboard/my-pay"
            className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 shrink-0 ml-2"
          >
            Portal <ArrowRightIcon className="size-3" />
          </Link>
        </div>
      </div>

      {/* Recent Payroll Runs Table */}
      {(canComputePayroll || canViewCompensation || canViewReports) && (
        <Card className="border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)] dark:border-slate-800">
          <CardHeader className="py-3.5 px-4.5 border-b border-slate-200/90 dark:border-slate-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <WalletIcon className="size-4 text-blue-600 dark:text-blue-400" /> Recent Payroll Runs
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Calculated and posted semi-monthly cutoff periods.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400" render={<Link href="/dashboard/payroll" />}>
              View All Runs &rarr;
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentRuns.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 space-y-3">
                <p>No payroll runs recorded yet.</p>
                {canComputePayroll && <CreateRunDialog />}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Run #</TableHead>
                    <TableHead>Cutoff Period</TableHead>
                    <TableHead>Pay Date</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRuns.map((r) => (
                    <TableRow key={r.id} className="group hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <TableCell className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        <Link href={`/dashboard/payroll/${r.id}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          #{r.runNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        {new Date(r.payrollPeriod.cutoffStart).toLocaleDateString()} – {new Date(r.payrollPeriod.cutoffEnd).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        {new Date(r.payrollPeriod.payDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                        {r._count.payslips} employees
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} size="sm" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/dashboard/payroll/${r.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        >
                          View Details <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
