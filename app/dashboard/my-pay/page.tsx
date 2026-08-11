import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricCard } from "@/components/ui/metric-card";
import { WalletIcon, BanknoteIcon, DownloadIcon, PalmtreeIcon, FileTextIcon } from "lucide-react";

export default async function EmployeeSelfServicePage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const employee = await prisma.employee.findUnique({
    where: { userId: session.user.id },
    include: {
      company: { select: { legalName: true } },
      compensationRecords: {
        orderBy: { effectiveFrom: "desc" },
        take: 1,
      },
      payslips: {
        where: { payrollRun: { status: "POSTED" } },
        include: {
          payrollRun: { include: { payrollPeriod: true } },
          lineItems: true,
        },
        orderBy: { payrollRun: { payrollPeriod: { cutoffStart: "desc" } } },
      },
      loans: {
        where: { status: { in: ["ACTIVE", "PENDING_APPROVAL"] } },
        orderBy: { createdAt: "desc" },
      },
      leaveBalances: {
        include: { leaveType: true },
        orderBy: { year: "desc" },
      },
    },
  });

  if (!employee) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center space-y-4">
        <Card className="p-6 border-slate-200/80 shadow-xs dark:border-slate-800">
          <CardTitle className="text-lg font-bold">Employee Self-Service Portal</CardTitle>
          <CardDescription className="mt-2 text-xs">
            Your login account ({session.user.email}) is not linked to an active employee HR profile yet.
          </CardDescription>
          <p className="mt-4 text-xs text-slate-500">
            Please ask your employer or HR/Payroll administrator to link your user account to your employee record in the Employee Directory.
          </p>
        </Card>
      </div>
    );
  }

  const activeComp = employee.compensationRecords[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`My Pay &amp; Benefits — ${employee.firstName} ${employee.lastName}`}
        description={`Employee ID: ${employee.employeeNumber} · ${employee.company.legalName}`}
        actions={<StatusBadge status={employee.employmentStatus} />}
      />

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          title="Current Basic Compensation"
          value={activeComp ? `₱${Number(activeComp.basicRate).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "N/A"}
          subtitle={`Pay Basis: ${activeComp?.payBasis.replaceAll("_", " ") ?? "N/A"}`}
          icon={BanknoteIcon}
        />
        <MetricCard
          title="Posted Payslips"
          value={employee.payslips.length}
          subtitle={employee.payslips[0] ? `Latest: ${new Date(employee.payslips[0].payrollRun.payrollPeriod.cutoffEnd).toLocaleDateString()}` : "No posted runs"}
          icon={WalletIcon}
        />
        <MetricCard
          title="Active Loans / Advances"
          value={employee.loans.length}
          subtitle="Auto-deducted on cutoffs"
          icon={FileTextIcon}
        />
      </div>

      {/* Posted Payslips */}
      <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <WalletIcon className="size-4 text-blue-600" /> Historical Payslips
          </CardTitle>
          <CardDescription className="text-xs">Download official PDF payslips for your records.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {employee.payslips.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">No posted payslips available yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 dark:bg-slate-900/80">
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Cutoff Period</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Pay Date</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Gross Pay</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Total Deductions</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Net Take-Home</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employee.payslips.map((p) => (
                  <TableRow key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <TableCell className="font-medium text-xs text-slate-900 dark:text-slate-100">
                      {new Date(p.payrollRun.payrollPeriod.cutoffStart).toLocaleDateString()} – {new Date(p.payrollRun.payrollPeriod.cutoffEnd).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {new Date(p.payrollRun.payrollPeriod.payDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      ₱{Number(p.grossPay).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                      ₱{(Number(p.totalStatutoryDeductions) + Number(p.totalOtherDeductions)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                      ₱{Number(p.netPay).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs font-semibold"
                        render={<a href={`/api/reports/payslip/${p.id}`} target="_blank" />}
                      >
                        <DownloadIcon className="size-3.5" /> PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Leave Balances */}
      <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <PalmtreeIcon className="size-4 text-blue-600" /> Annual Leave Balances
          </CardTitle>
          <CardDescription className="text-xs">Entitled, used, and remaining leave balance days.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {employee.leaveBalances.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">No leave balances assigned.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 dark:bg-slate-900/80">
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Leave Type</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Year</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Entitled</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Used</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Remaining Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employee.leaveBalances.map((b) => {
                  const remaining = Number(b.entitledDays) + Number(b.carriedOverDays) + Number(b.adjustedDays) - Number(b.usedDays);
                  return (
                    <TableRow key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <TableCell className="font-bold text-xs text-slate-900 dark:text-slate-100">{b.leaveType.name}</TableCell>
                      <TableCell className="text-xs font-medium">{b.year}</TableCell>
                      <TableCell className="text-xs font-medium">{Number(b.entitledDays)} days</TableCell>
                      <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-400">{Number(b.usedDays)} days</TableCell>
                      <TableCell className="text-right font-mono font-bold text-sm text-slate-900 dark:text-slate-100">{remaining} days</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
