import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
        <Card className="p-6">
          <CardTitle className="text-xl">Employee Portal</CardTitle>
          <CardDescription className="mt-2">
            Your login account ({session.user.email}) is not associated with an employee HR profile yet.
          </CardDescription>
          <p className="mt-4 text-sm text-muted-foreground">
            Please ask your employer or HR/Payroll administrator to link your user account to your employee record in the Employee Directory.
          </p>
        </Card>
      </div>
    );
  }

  const activeComp = employee.compensationRecords[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Pay & Benefits</h1>
        <p className="text-sm text-muted-foreground">
          {employee.firstName} {employee.lastName} ({employee.employeeNumber}) · {employee.company.legalName}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Employment Status</CardDescription>
            <CardTitle className="text-lg">
              <Badge variant="default">{employee.employmentStatus}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Position: {employee.positionTitle || "N/A"}<br />
            Hired: {new Date(employee.dateHired).toLocaleDateString()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Basic Compensation</CardDescription>
            <CardTitle className="text-lg">
              {activeComp ? `₱${Number(activeComp.basicRate).toLocaleString()}` : "N/A"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Pay Basis: {activeComp?.payBasis.replaceAll("_", " ") ?? "N/A"}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Recent Payslips</CardDescription>
            <CardTitle className="text-lg">{employee.payslips.length} Posted</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Latest: {employee.payslips[0] ? new Date(employee.payslips[0].payrollRun.payrollPeriod.cutoffEnd).toLocaleDateString() : "None"}
          </CardContent>
        </Card>
      </div>

      {/* Posted Payslips */}
      <Card>
        <CardHeader>
          <CardTitle>My Payslips</CardTitle>
          <CardDescription>Historical posted payslips available for download.</CardDescription>
        </CardHeader>
        <CardContent>
          {employee.payslips.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No posted payslips yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cutoff Period</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead>Gross Pay</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employee.payslips.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {new Date(p.payrollRun.payrollPeriod.cutoffStart).toLocaleDateString()} – {new Date(p.payrollRun.payrollPeriod.cutoffEnd).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{new Date(p.payrollRun.payrollPeriod.payDate).toLocaleDateString()}</TableCell>
                    <TableCell>₱{Number(p.grossPay).toLocaleString()}</TableCell>
                    <TableCell>₱{(Number(p.totalStatutoryDeductions) + Number(p.totalOtherDeductions)).toLocaleString()}</TableCell>
                    <TableCell className="font-bold text-foreground">₱{Number(p.netPay).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" render={<a href={`/api/reports/payslip/${p.id}`} target="_blank" />}>
                        Download PDF
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
      <Card>
        <CardHeader>
          <CardTitle>My Leave Balances</CardTitle>
          <CardDescription>Entitled and remaining leave days for the current calendar year.</CardDescription>
        </CardHeader>
        <CardContent>
          {employee.leaveBalances.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No leave balances assigned.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Entitled</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employee.leaveBalances.map((b) => {
                  const remaining = Number(b.entitledDays) + Number(b.carriedOverDays) + Number(b.adjustedDays) - Number(b.usedDays);
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.leaveType.name}</TableCell>
                      <TableCell>{b.year}</TableCell>
                      <TableCell>{Number(b.entitledDays)} days</TableCell>
                      <TableCell>{Number(b.usedDays)} days</TableCell>
                      <TableCell className="font-bold">{remaining} days</TableCell>
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
