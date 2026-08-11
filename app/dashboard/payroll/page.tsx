import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/db/scoped";
import { CreateRunDialog } from "@/components/payroll/create-run-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Pager } from "@/components/ui/pager";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePageParam, paginationMeta } from "@/lib/pagination";
import { RunActions } from "@/components/payroll/run-actions";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricCard } from "@/components/ui/metric-card";
import { WalletIcon, CheckCircle2Icon, ClockIcon, ArrowRightIcon } from "lucide-react";
import { PayrollRunStatus } from "@/lib/generated/prisma/enums";

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const ctx = await getTenantContext();
  const page = parsePageParam((await searchParams).page);
  const totalCount = await prisma.payrollRun.count({ where: { companyId: ctx.companyId } });
  const { skip, take, totalPages } = paginationMeta(page, totalCount);

  const [runs, postedCount, draftCount] = await Promise.all([
    prisma.payrollRun.findMany({
      where: { companyId: ctx.companyId },
      include: { payrollPeriod: true, _count: { select: { payslips: true } } },
      orderBy: { runNumber: "desc" },
      skip,
      take,
    }),
    prisma.payrollRun.count({
      where: { companyId: ctx.companyId, status: PayrollRunStatus.POSTED },
    }),
    prisma.payrollRun.count({
      where: { companyId: ctx.companyId, status: PayrollRunStatus.DRAFT },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll Runs &amp; Register"
        description="Calculate semi-monthly payroll periods, inspect draft payslips, recompute adjustments, approve and post."
        actions={<CreateRunDialog />}
      />

      {/* Summary KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          title="Total Runs"
          value={totalCount}
          subtitle="Processed payroll cutoffs"
          icon={WalletIcon}
        />
        <MetricCard
          title="Posted Runs"
          value={postedCount}
          subtitle="Approved &amp; posted payslips"
          icon={CheckCircle2Icon}
        />
        <MetricCard
          title="Draft / Pending Runs"
          value={draftCount}
          subtitle="Cutoffs awaiting approval"
          icon={ClockIcon}
        />
      </div>

      {/* Main Runs Table Card */}
      <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <WalletIcon className="size-4 text-blue-600" /> Payroll History
          </CardTitle>
          <CardDescription className="text-xs">
            Chronological list of semi-monthly payroll runs and execution statuses.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {runs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">No payroll runs created yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 dark:bg-slate-900/80">
                  <TableHead className="w-[100px] text-xs font-bold uppercase tracking-wider text-slate-500">Run #</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Cutoff Period</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Pay Date</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Employees</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => (
                  <TableRow key={r.id} className="group hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <TableCell className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                      <Link href={`/dashboard/payroll/${r.id}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        #{r.runNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {r.payrollPeriod.cutoffStart.toLocaleDateString()} – {r.payrollPeriod.cutoffEnd.toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {r.payrollPeriod.payDate.toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {r._count.payslips} employees
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <RunActions runId={r.id} status={r.status} />
                        <Link
                          href={`/dashboard/payroll/${r.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          View <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800">
          <Pager page={page} totalPages={totalPages} basePath="/dashboard/payroll" />
        </div>
      </Card>
    </div>
  );
}
