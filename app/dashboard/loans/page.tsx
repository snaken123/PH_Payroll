import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricCard } from "@/components/ui/metric-card";
import { BanknoteIcon, ClockIcon, CheckCircle2Icon, ArrowRightIcon } from "lucide-react";
import { LoanStatus } from "@/lib/generated/prisma/enums";

export default async function CompanyLoansPage() {
  const ctx = await getTenantContext();

  const [loans, activeCount, pendingCount, totalBalanceResult] = await Promise.all([
    prisma.loan.findMany({
      where: withCompanyScope(ctx.companyId, {}),
      include: {
        employee: {
          select: { id: true, employeeNumber: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.loan.count({
      where: withCompanyScope(ctx.companyId, { status: LoanStatus.ACTIVE }),
    }),
    prisma.loan.count({
      where: withCompanyScope(ctx.companyId, { status: LoanStatus.PENDING_APPROVAL }),
    }),
    prisma.loan.aggregate({
      where: withCompanyScope(ctx.companyId, { status: LoanStatus.ACTIVE }),
      _sum: { remainingBalance: true },
    }),
  ]);

  const totalRemainingBalance = Number(totalBalanceResult._sum.remainingBalance ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Loans &amp; Cash Advances"
        description="Company-wide register of active loans, SSS/Pag-IBIG government loans, and cash advance requests."
      />

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          title="Active Loans"
          value={activeCount}
          subtitle="Auto-deducted on payroll cutoffs"
          icon={BanknoteIcon}
        />
        <MetricCard
          title="Pending Cash Advances"
          value={pendingCount}
          subtitle="Awaiting management approval"
          icon={ClockIcon}
        />
        <MetricCard
          title="Total Outstanding Balance"
          value={`₱${totalRemainingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          subtitle="Company-wide active loan principal"
          icon={CheckCircle2Icon}
        />
      </div>

      {/* Loans Data Table */}
      <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BanknoteIcon className="size-4 text-blue-600" /> All Employee Loans &amp; Advances
          </CardTitle>
          <CardDescription className="text-xs">
            Loan deductions are automatically processed on cutoffs and capped so net pay never goes negative.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loans.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">No loans or cash advances recorded yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 dark:bg-slate-900/80">
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Employee</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Loan Name</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Category</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Principal</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Installment</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Remaining</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Frequency</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow key={loan.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <TableCell className="font-bold text-xs">
                      <Link href={`/dashboard/employees/${loan.employee.id}`} className="text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400">
                        {loan.employee.lastName}, {loan.employee.firstName} <span className="font-mono text-slate-500 font-normal">({loan.employee.employeeNumber})</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-800 dark:text-slate-200">{loan.name}</TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400">{loan.category.replaceAll("_", " ")}</TableCell>
                    <TableCell className="text-right font-mono text-xs">₱{Number(loan.principal).toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">₱{Number(loan.installmentAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                      ₱{Number(loan.remainingBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-300">{loan.deductionFrequency.replaceAll("_", " ")}</TableCell>
                    <TableCell>
                      <StatusBadge status={loan.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/employees/${loan.employee.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Profile <ArrowRightIcon className="size-3" />
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
