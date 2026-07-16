import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { assertCompanyId, getTenantContext } from "@/lib/db/scoped";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RunActions } from "@/components/payroll/run-actions";
import { PayslipDetailDialog } from "@/components/payroll/payslip-detail-dialog";
import { Button } from "@/components/ui/button";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  DRAFT: "secondary",
  APPROVED: "default",
  POSTED: "default",
  VOID: "destructive",
};

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

  const totalNet = run.payslips.reduce((sum, p) => sum + Number(p.netPay), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Payroll run #{run.runNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {run.payrollPeriod.cutoffStart.toLocaleDateString()} –{" "}
            {run.payrollPeriod.cutoffEnd.toLocaleDateString()} · Pay date{" "}
            {run.payrollPeriod.payDate.toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={STATUS_VARIANT[run.status] ?? "secondary"}>{run.status}</Badge>
          {run.status === "POSTED" && (
            <Button variant="outline" size="sm" render={<a href={`/api/reports/payroll-register/${run.id}`} target="_blank" />}>
              Payroll register PDF
            </Button>
          )}
          <RunActions runId={run.id} status={run.status} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payslips ({run.payslips.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {run.payslips.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payslips in this run.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Statutory</TableHead>
                    <TableHead>Other</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {run.payslips.map((p) => {
                    const employeeName = `${p.employee.lastName}, ${p.employee.firstName} (${p.employee.employeeNumber})`;
                    return (
                      <TableRow key={p.id}>
                        <TableCell>{employeeName}</TableCell>
                        <TableCell>₱{Number(p.grossPay).toLocaleString()}</TableCell>
                        <TableCell>₱{Number(p.totalStatutoryDeductions).toLocaleString()}</TableCell>
                        <TableCell>₱{Number(p.totalOtherDeductions).toLocaleString()}</TableCell>
                        <TableCell className="font-medium">₱{Number(p.netPay).toLocaleString()}</TableCell>
                        <TableCell>
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
              </Table>
              <div className="mt-4 flex justify-end text-sm font-medium">
                Total net pay: ₱{totalNet.toLocaleString()}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
