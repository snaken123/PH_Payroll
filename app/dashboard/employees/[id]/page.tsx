import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { assertCompanyId, getTenantContext } from "@/lib/db/scoped";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AddCompensationDialog } from "@/components/employees/add-compensation-dialog";
import { EditEmployeeProfileDialog } from "@/components/employees/edit-employee-profile-dialog";
import { CreateLoanDialog } from "@/components/loans/create-loan-dialog";
import { CancelLoanButton } from "@/components/loans/cancel-loan-button";
import { LoanApprovalActions } from "@/components/loans/loan-approval-actions";
import { MarkSeparatedDialog } from "@/components/employees/mark-separated-dialog";
import { ClearanceToggle, ComputeFinalPayButton } from "@/components/employees/separation-panel";
import { estimateDailyRateEquivalent } from "@/lib/payroll/estimateDailyRateEquivalent";
import type { PayBasis } from "@/lib/payroll/types";
import { WageSector } from "@/lib/generated/prisma/enums";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricCard } from "@/components/ui/metric-card";
import {
  UserIcon,
  BriefcaseIcon,
  ShieldCheckIcon,
  FileTextIcon,
  BanknoteIcon,
  AlertTriangleIcon,
  ArrowLeftIcon,
  DownloadIcon,
} from "lucide-react";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getTenantContext();

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      branch: { select: { name: true, region: true } },
      compensationRecords: { orderBy: { effectiveFrom: "desc" }, include: { allowances: true } },
      loans: { orderBy: { startDate: "desc" } },
      finalPayRuns: { orderBy: { finalPayNumber: "desc" } },
    },
  });

  if (!employee) notFound();
  try {
    assertCompanyId(ctx, employee.companyId);
  } catch {
    notFound();
  }

  // Advisory-only minimum wage check
  const currentComp = employee.compensationRecords.find((c) => c.effectiveTo === null);
  let minimumWageWarning: string | null = null;
  if (currentComp) {
    const today = new Date();
    const applicableWage = await prisma.minimumWageRate.findFirst({
      where: {
        region: employee.branch.region,
        sector: WageSector.NON_AGRICULTURE,
        effectiveFrom: { lte: today },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
      },
      orderBy: { effectiveFrom: "desc" },
    });
    if (applicableWage) {
      const dailyRateEquivalent = estimateDailyRateEquivalent(
        currentComp.payBasis as PayBasis,
        currentComp.basicRate.toString(),
        currentComp.standardWorkDaysPerMonth?.toString()
      );
      if (dailyRateEquivalent.lessThan(applicableWage.dailyRate.toString())) {
        minimumWageWarning = `This employee's current daily-rate equivalent (₱${dailyRateEquivalent.toFixed(2)}) is below the applicable minimum wage for ${employee.branch.region} (₱${applicableWage.dailyRate.toString()}/day, per ${applicableWage.wageOrderReference}). Pay was not auto-adjusted.`;
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/dashboard/employees"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeftIcon className="size-3.5" /> Back to Employee Roster
        </Link>
      </div>

      {/* Header Profile */}
      <PageHeader
        title={`${employee.lastName}, ${employee.firstName} ${employee.middleName ?? ""}`}
        description={`${employee.employeeNumber} · ${employee.positionTitle} · ${employee.branch.name}`}
        actions={
          <>
            <StatusBadge status={employee.employmentStatus} />
            <EditEmployeeProfileDialog
              employeeId={employee.id}
              defaultValues={{
                employeeNumber: employee.employeeNumber,
                firstName: employee.firstName,
                lastName: employee.lastName,
                middleName: employee.middleName ?? "",
                birthDate: employee.birthDate.toISOString().slice(0, 10),
                sex: employee.sex,
                civilStatus: employee.civilStatus,
                positionTitle: employee.positionTitle,
                departmentName: employee.departmentName ?? "",
                tin: employee.tin ?? "",
                sssNumber: employee.sssNumber ?? "",
                philhealthNumber: employee.philhealthNumber ?? "",
                pagibigNumber: employee.pagibigNumber ?? "",
              }}
            />
          </>
        }
      />

      {minimumWageWarning && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 flex items-start gap-2.5 shadow-xs">
          <AlertTriangleIcon className="size-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold uppercase tracking-wider">Minimum Wage Advisory:</strong> {minimumWageWarning}
          </div>
        </div>
      )}

      {/* Quick Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Current Basic Rate"
          value={currentComp ? `₱${Number(currentComp.basicRate).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
          subtitle={currentComp ? `${currentComp.payBasis.replaceAll("_", " ")} Rate` : "No active comp"}
          icon={BanknoteIcon}
        />
        <MetricCard
          title="Date Hired"
          value={employee.dateHired.toLocaleDateString()}
          subtitle={`Tenure: ${Math.floor((new Date().getTime() - employee.dateHired.getTime()) / (1000 * 60 * 60 * 24 * 365.25))} yrs`}
          icon={BriefcaseIcon}
        />
        <MetricCard
          title="Department"
          value={employee.departmentName || "General"}
          subtitle={`Branch: ${employee.branch.name}`}
          icon={UserIcon}
        />
        <MetricCard
          title="Government Compliance"
          value={employee.tin && employee.sssNumber ? "Verified" : "Pending IDs"}
          subtitle="TIN, SSS, PhilHealth, Pag-IBIG"
          icon={ShieldCheckIcon}
        />
      </div>

      {/* Information Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BriefcaseIcon className="size-4 text-blue-600" /> Employment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500 font-medium">Employee Type</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{employee.employeeType.replaceAll("_", " ")}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500 font-medium">Date Hired</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{employee.dateHired.toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500 font-medium">Managerial Exempt</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{employee.isManagerialExempt ? "Yes (Exempt from OT)" : "No"}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-medium">Branch Location</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{employee.branch.name} ({employee.branch.region})</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheckIcon className="size-4 text-blue-600" /> Government Statutory Numbers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500 font-medium">Tax Identification # (TIN)</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{employee.tin ?? "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500 font-medium">SSS Number</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{employee.sssNumber ?? "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500 font-medium">PhilHealth Number</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{employee.philhealthNumber ?? "—"}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-medium">Pag-IBIG (HDMF) Number</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{employee.pagibigNumber ?? "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Separation & Final Pay Panel */}
      <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileTextIcon className="size-4 text-blue-600" /> Separation &amp; Final Pay Clearance
            </CardTitle>
            <CardDescription className="text-xs">Manage employee offboarding, COE, and final pay computations.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-semibold"
              render={<a href={`/api/reports/certificate-of-employment/${employee.id}`} target="_blank" />}
            >
              <DownloadIcon className="size-3.5" /> COE Document
            </Button>
            {!employee.dateSeparated && <MarkSeparatedDialog employeeId={employee.id} />}
          </div>
        </CardHeader>
        <CardContent className="p-4 text-xs space-y-3">
          {!employee.dateSeparated ? (
            <p className="text-slate-500 dark:text-slate-400">Employee is currently active on the payroll roster.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Separation Date</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{employee.dateSeparated.toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Category</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{employee.separationCategory?.replaceAll("_", " ") ?? "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Notes</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{employee.separationReason || "None"}</span>
                </div>
              </div>

              <ClearanceToggle employeeId={employee.id} clearanceCompleted={employee.clearanceCompleted} />

              {(() => {
                const activeRun = employee.finalPayRuns.find((r) => r.status !== "VOID");
                if (activeRun) {
                  return (
                    <Button variant="outline" size="sm" render={<Link href={`/dashboard/employees/${employee.id}/final-pay/${activeRun.id}`} />}>
                      View Final Pay #{activeRun.finalPayNumber} ({activeRun.status})
                    </Button>
                  );
                }
                return <ComputeFinalPayButton employeeId={employee.id} />;
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compensation History */}
      <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">Compensation History</CardTitle>
            <CardDescription className="text-xs">Historical basic pay rates, effective dates, and allowances.</CardDescription>
          </div>
          <AddCompensationDialog employeeId={employee.id} />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 dark:bg-slate-900/80">
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Effective From</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Effective To</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Pay Basis</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Basic Rate</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Allowances</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employee.compensationRecords.map((c) => (
                <TableRow key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <TableCell className="text-xs font-medium">{c.effectiveFrom.toLocaleDateString()}</TableCell>
                  <TableCell className="text-xs font-medium">{c.effectiveTo ? c.effectiveTo.toLocaleDateString() : "Current Active"}</TableCell>
                  <TableCell className="text-xs font-semibold">{c.payBasis.replaceAll("_", " ")}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                    ₱{Number(c.basicRate).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                    {c.allowances.length === 0
                      ? "—"
                      : c.allowances
                          .map((a) => `${a.label} (₱${Number(a.amount).toLocaleString()}${a.isTaxable ? "" : ", non-taxable"})`)
                          .join(", ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Loans & Cash Advances */}
      <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">Loans &amp; Cash Advances</CardTitle>
            <CardDescription className="text-xs">Active loans and automated cutoff deductions.</CardDescription>
          </div>
          <CreateLoanDialog employeeId={employee.id} />
        </CardHeader>
        <CardContent className="p-0">
          {employee.loans.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No active loans or cash advances on record.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 dark:bg-slate-900/80">
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Loan Name</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Category</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Principal</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Installment</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Frequency</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Remaining</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employee.loans.map((l) => (
                  <TableRow key={l.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <TableCell className="font-semibold text-xs text-slate-900 dark:text-slate-100">{l.name}</TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400">{l.category.replaceAll("_", " ")}</TableCell>
                    <TableCell className="text-right font-mono text-xs">₱{Number(l.principal).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">₱{Number(l.installmentAmount).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{l.deductionFrequency === "MONTHLY" ? "Monthly" : "Every Cutoff"}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                      ₱{Number(l.remainingBalance).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={l.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {l.status === "ACTIVE" && <CancelLoanButton loanId={l.id} />}
                      {l.status === "PENDING_APPROVAL" && <LoanApprovalActions loanId={l.id} />}
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
