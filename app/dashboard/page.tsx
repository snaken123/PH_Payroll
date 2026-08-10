import Link from "next/link";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";
import { prisma } from "@/lib/db";
import { EmploymentStatus, LoanStatus } from "@/lib/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateRunDialog } from "@/components/payroll/create-run-dialog";
import {
  UsersIcon,
  Building2Icon,
  WalletIcon,
  BanknoteIcon,
  ArrowRightIcon,
  FileTextIcon,
  CheckCircle2Icon,
  ClockIcon,
  ShieldCheckIcon,
  PlusIcon,
} from "lucide-react";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  PENDING_APPROVAL: "outline",
  APPROVED: "default",
  POSTED: "default",
  VOID: "destructive",
};

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
    <div className="space-y-8">
      {/* Welcome Banner Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/40 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-background/80 text-primary border-primary/20 font-medium">
                Active Tenant
              </Badge>
              <span className="text-xs text-muted-foreground">{formattedDate}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back to {company.legalName}
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Philippine semi-monthly payroll compliance engine. All statutory rate tables (SSS, PhilHealth, Pag-IBIG, BIR) are verified and active.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <CreateRunDialog />
            <Button variant="outline" render={<Link href="/dashboard/employees" />}>
              <UsersIcon className="size-4 mr-1.5" />
              Employee Directory
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Employees
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <UsersIcon className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeeCount}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <CheckCircle2Icon className="size-3 text-emerald-500" /> Active on payroll
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Latest Run Status
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <WalletIcon className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            {latestRun ? (
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">#{latestRun.runNumber}</span>
                  <Badge variant={STATUS_VARIANT[latestRun.status] ?? "secondary"}>
                    {latestRun.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Paid: {new Date(latestRun.payrollPeriod.payDate).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <div>
                <div className="text-xl font-medium text-muted-foreground">No runs yet</div>
                <p className="text-xs text-muted-foreground mt-1">Click Run Payroll to start</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Loans
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <BanknoteIcon className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLoansCount}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <ClockIcon className="size-3" /> Auto-deducted on cutoffs
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Company Branches
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Building2Icon className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{branchCount}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <ShieldCheckIcon className="size-3 text-emerald-500" /> Region: {company.region}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Tiles */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="group relative overflow-hidden p-6 hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="p-2.5 size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <WalletIcon className="size-5" />
              </div>
              <h3 className="font-semibold text-base">Payroll Runs</h3>
              <p className="text-xs text-muted-foreground">Compute semi-monthly cutoffs, review draft payslips, approve and post.</p>
            </div>
          </div>
          <Link href="/dashboard/payroll" className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            Go to Payroll <ArrowRightIcon className="size-3 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Card>

        <Card className="group relative overflow-hidden p-6 hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="p-2.5 size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FileTextIcon className="size-5" />
              </div>
              <h3 className="font-semibold text-base">BIR &amp; Statutory Reports</h3>
              <p className="text-xs text-muted-foreground">Download BIR 1601-C, 2316, BIR Alphalist, SSS R-3, and PhilHealth RF-1 PDFs.</p>
            </div>
          </div>
          <Link href="/dashboard/reports" className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
            View Reports <ArrowRightIcon className="size-3 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Card>

        <Card className="group relative overflow-hidden p-6 hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="p-2.5 size-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <UsersIcon className="size-5" />
              </div>
              <h3 className="font-semibold text-base">Employee Self-Service</h3>
              <p className="text-xs text-muted-foreground">Employees can view compensation details, leave balances, and download posted payslips.</p>
            </div>
          </div>
          <Link href="/dashboard/my-pay" className="mt-4 flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline">
            Open Employee Portal <ArrowRightIcon className="size-3 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Card>
      </div>

      {/* Recent Payroll Runs Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recent Payroll Runs</CardTitle>
            <CardDescription className="text-xs">Latest calculated and posted payroll periods.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" render={<Link href="/dashboard/payroll" />}>
            View All Runs &rarr;
          </Button>
        </CardHeader>
        <CardContent>
          {recentRuns.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground space-y-3">
              <p>No payroll runs recorded yet.</p>
              <CreateRunDialog />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run #</TableHead>
                  <TableHead>Cutoff Period</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRuns.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-bold">
                      <Link href={`/dashboard/payroll/${r.id}`} className="hover:underline text-primary">
                        #{r.runNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(r.payrollPeriod.cutoffStart).toLocaleDateString()} – {new Date(r.payrollPeriod.cutoffEnd).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs">{new Date(r.payrollPeriod.payDate).toLocaleDateString()}</TableCell>
                    <TableCell>{r._count.payslips} employees</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/payroll/${r.id}`} className="text-xs font-medium text-primary hover:underline">
                        View details &rarr;
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
