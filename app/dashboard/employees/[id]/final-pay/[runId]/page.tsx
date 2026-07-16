import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { assertCompanyId, getTenantContext } from "@/lib/db/scoped";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FinalPayActions } from "@/components/finalpay/final-pay-actions";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  DRAFT: "secondary",
  APPROVED: "default",
  POSTED: "default",
  VOID: "destructive",
};

export default async function FinalPayRunDetailPage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>;
}) {
  const { id: employeeId, runId } = await params;
  const ctx = await getTenantContext();

  const run = await prisma.finalPayRun.findUnique({
    where: { id: runId },
    include: {
      employee: { select: { employeeNumber: true, firstName: true, lastName: true, clearanceCompleted: true } },
      lineItems: true,
    },
  });

  if (!run || run.employeeId !== employeeId) notFound();
  try {
    assertCompanyId(ctx, run.companyId);
  } catch {
    notFound();
  }

  const netFinalPay = Number(run.netFinalPay);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Final pay #{run.finalPayNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {run.employee.lastName}, {run.employee.firstName} ({run.employee.employeeNumber}) · Separation date{" "}
            {run.separationDate.toLocaleDateString()} · {run.separationCategory.replaceAll("_", " ")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={STATUS_VARIANT[run.status] ?? "secondary"}>{run.status}</Badge>
          {run.status === "POSTED" && (
            <Button variant="outline" size="sm" render={<a href={`/api/reports/final-pay/${run.id}`} target="_blank" />}>
              Final pay statement PDF
            </Button>
          )}
          <FinalPayActions runId={run.id} status={run.status} clearanceCompleted={run.employee.clearanceCompleted} />
        </div>
      </div>

      {netFinalPay < 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <strong>Employee owes the company ₱{Math.abs(netFinalPay).toLocaleString()}.</strong> Deductions exceed
          what's owed to the employee — this is not floored at zero.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Tax exempt</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {run.lineItems.map((li) => (
                <TableRow key={li.id}>
                  <TableCell>{li.category.replaceAll("_", " ")}</TableCell>
                  <TableCell>{li.description}</TableCell>
                  <TableCell>{li.direction.replaceAll("_", " ")}</TableCell>
                  <TableCell>{li.isTaxExempt ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-right">₱{Number(li.amount).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex flex-col items-end gap-1 text-sm">
            <p>Gross final pay: ₱{Number(run.grossFinalPay).toLocaleString()}</p>
            <p>Total deductions: ₱{Number(run.totalDeductions).toLocaleString()}</p>
            <p className="font-medium">
              Net final pay: {netFinalPay < 0 ? "-" : ""}₱{Math.abs(netFinalPay).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
