import Link from "next/link";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";
import { prisma } from "@/lib/db";
import { LoanStatus } from "@/lib/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateRunDialog } from "@/components/payroll/create-run-dialog";
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

export default async function DashboardPage() {
  const ctx = await getTenantContext();

  const [company, employeeCount, branchCount, activeLoansCount, latestRun, recentRuns] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: ctx.companyId } }),
    prisma.employee.count({ where: withCompanyScope(ctx.companyId) }),
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
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold" render={<Link href="/dashboard/employees" />}>
              <UsersIcon className="size-3.5 text-slate-500" />
              Employee Directory
            </Button>
            <CreateRunDialog />
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
          value={latestRun ? `#${latestRun.runNumber}` : "No runs"}
          subtitle={latestRun ? `Paid: ${new Date(latestRun.payrollPeriod.payDate).toLocaleDateString()}` : "Click Run Payroll to start"}
          icon={WalletIcon}
          badge={latestRun ? <StatusBadge status={latestRun.status} /> : undefined}
        />
        <MetricCard
          title="Active Loans"
          value={activeLoansCount}
          subtitle="Automated cutoff deductions"
          icon={BanknoteIcon}
        />
        <MetricCard
          title="Company Locations"
          value={branchCount}
          subtitle={`Head Office: ${company.region}`}
          icon={Building2Icon}
        />
      </div>

      {/* Operational Highlights / Quick Access Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="group border-slate-200/80 shadow-xs hover:border-slate-300 dark:border-slate-800 transition-all p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="size-9 rounded-lg bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-400 flex items-center justify-center font-bold">
              <WalletIcon className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Payroll Computation</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Compute semi-monthly cutoffs, review draft payslips, recompute adjustments, approve and post runs.
              </p>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <Link href="/dashboard/payroll" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              Open Payroll Register <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </Card>

        <Card className="group border-slate-200/80 shadow-xs hover:border-slate-300 dark:border-slate-800 transition-all p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="size-9 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-slate-800 dark:text-emerald-400 flex items-center justify-center font-bold">
              <FileTextIcon className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Statutory Tax &amp; Government Reports</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Generate official BIR 1601-C, BIR 2316, BIR Alphalist, SSS R-3, and PhilHealth RF-1 statutory PDF reports.
              </p>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <Link href="/dashboard/reports" className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300">
              View Reports Library <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </Card>

        <Card className="group border-slate-200/80 shadow-xs hover:border-slate-300 dark:border-slate-800 transition-all p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="size-9 rounded-lg bg-purple-50 text-purple-600 dark:bg-slate-800 dark:text-purple-400 flex items-center justify-center font-bold">
              <UserCheckIcon className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Employee Self-Service Portal</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Employees can view compensation breakdowns, track leave balances, and download official posted payslip PDFs.
              </p>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <Link href="/dashboard/my-pay" className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300">
              Launch Portal <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Recent Payroll Runs Table */}
      <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Recent Payroll Runs</CardTitle>
            <CardDescription className="text-xs">Calculated and posted semi-monthly payroll periods.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="text-xs font-semibold text-blue-600 dark:text-blue-400" render={<Link href="/dashboard/payroll" />}>
            View All Runs &rarr;
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recentRuns.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-3">
              <p>No payroll runs recorded yet.</p>
              <CreateRunDialog />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 dark:bg-slate-900/80">
                  <TableHead className="w-[100px] text-xs font-bold uppercase tracking-wider text-slate-500">Run #</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Cutoff Period</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Pay Date</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Employees</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRuns.map((r) => (
                  <TableRow key={r.id} className="group hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <TableCell className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                      <Link href={`/dashboard/payroll/${r.id}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        #{r.runNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                      {new Date(r.payrollPeriod.cutoffStart).toLocaleDateString()} – {new Date(r.payrollPeriod.cutoffEnd).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      {new Date(r.payrollPeriod.payDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-900 dark:text-slate-100">
                      {r._count.payslips} employees
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/payroll/${r.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Details <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
                      </Link>
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
}
