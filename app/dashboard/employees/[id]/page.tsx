import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { assertCompanyId, getTenantContext } from "@/lib/db/scoped";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddCompensationDialog } from "@/components/employees/add-compensation-dialog";
import { CreateLoanDialog } from "@/components/loans/create-loan-dialog";
import { CancelLoanButton } from "@/components/loans/cancel-loan-button";
import { MarkSeparatedDialog } from "@/components/employees/mark-separated-dialog";
import { ClearanceToggle, ComputeFinalPayButton } from "@/components/employees/separation-panel";
import { estimateDailyRateEquivalent } from "@/lib/payroll/estimateDailyRateEquivalent";
import type { PayBasis } from "@/lib/payroll/types";

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
      branch: true,
      compensationRecords: { orderBy: { effectiveFrom: "desc" } },
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

  // Advisory-only minimum wage check (never auto-adjusts pay — region/
  // sector classification is genuinely ambiguous for many businesses).
  const currentComp = employee.compensationRecords.find((c) => c.effectiveTo === null);
  let minimumWageWarning: string | null = null;
  if (currentComp) {
    const today = new Date();
    const applicableWage = await prisma.minimumWageRate.findFirst({
      where: {
        region: employee.branch.region,
        sector: "NON_AGRICULTURE",
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
        minimumWageWarning = `This employee's current daily-rate equivalent (₱${dailyRateEquivalent.toFixed(2)}) is below the applicable minimum wage for ${employee.branch.region} (₱${applicableWage.dailyRate.toString()}/day, per ${applicableWage.wageOrderReference}). This is advisory only — pay was not auto-adjusted.`;
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {employee.lastName}, {employee.firstName} {employee.middleName ?? ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            {employee.employeeNumber} · {employee.positionTitle} · {employee.branch.name}
          </p>
        </div>
        <Badge variant={employee.employmentStatus === "REGULAR" ? "default" : "secondary"}>
          {employee.employmentStatus}
        </Badge>
      </div>

      {minimumWageWarning && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <strong>Minimum wage advisory:</strong> {minimumWageWarning}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Employment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Type: {employee.employeeType.replaceAll("_", " ")}</p>
            <p>Date hired: {employee.dateHired.toLocaleDateString()}</p>
            <p>Managerial exempt: {employee.isManagerialExempt ? "Yes" : "No"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Government IDs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>TIN: {employee.tin ?? "—"}</p>
            <p>SSS: {employee.sssNumber ?? "—"}</p>
            <p>PhilHealth: {employee.philhealthNumber ?? "—"}</p>
            <p>Pag-IBIG: {employee.pagibigNumber ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Separation &amp; final pay</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              render={<a href={`/api/reports/certificate-of-employment/${employee.id}`} target="_blank" />}
            >
              Certificate of employment
            </Button>
            {!employee.dateSeparated && <MarkSeparatedDialog employeeId={employee.id} />}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!employee.dateSeparated ? (
            <p className="text-muted-foreground">This employee is currently active.</p>
          ) : (
            <>
              <p>Separation date: {employee.dateSeparated.toLocaleDateString()}</p>
              <p>Category: {employee.separationCategory?.replaceAll("_", " ") ?? "—"}</p>
              {employee.separationReason && <p>Notes: {employee.separationReason}</p>}
              <ClearanceToggle employeeId={employee.id} clearanceCompleted={employee.clearanceCompleted} />
              {(() => {
                const activeRun = employee.finalPayRuns.find((r) => r.status !== "VOID");
                if (activeRun) {
                  return (
                    <Button variant="outline" size="sm" render={<Link href={`/dashboard/employees/${employee.id}/final-pay/${activeRun.id}`} />}>
                      View final pay #{activeRun.finalPayNumber} ({activeRun.status})
                    </Button>
                  );
                }
                return <ComputeFinalPayButton employeeId={employee.id} />;
              })()}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Compensation history</CardTitle>
          <AddCompensationDialog employeeId={employee.id} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Effective from</TableHead>
                <TableHead>Effective to</TableHead>
                <TableHead>Pay basis</TableHead>
                <TableHead>Basic rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employee.compensationRecords.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.effectiveFrom.toLocaleDateString()}</TableCell>
                  <TableCell>{c.effectiveTo ? c.effectiveTo.toLocaleDateString() : "Current"}</TableCell>
                  <TableCell>{c.payBasis.replaceAll("_", " ")}</TableCell>
                  <TableCell>₱{Number(c.basicRate).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Loans &amp; cash advances</CardTitle>
          <CreateLoanDialog employeeId={employee.id} />
        </CardHeader>
        <CardContent>
          {employee.loans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No loans on record.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Installment</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employee.loans.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.name}</TableCell>
                    <TableCell>{l.category.replaceAll("_", " ")}</TableCell>
                    <TableCell>₱{Number(l.principal).toLocaleString()}</TableCell>
                    <TableCell>₱{Number(l.installmentAmount).toLocaleString()}</TableCell>
                    <TableCell>₱{Number(l.remainingBalance).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={l.status === "ACTIVE" ? "default" : "secondary"}>{l.status}</Badge>
                    </TableCell>
                    <TableCell>{l.status === "ACTIVE" && <CancelLoanButton loanId={l.id} />}</TableCell>
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
