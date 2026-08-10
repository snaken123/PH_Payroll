import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/db/scoped";
import { CreateRunDialog } from "@/components/payroll/create-run-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pager } from "@/components/ui/pager";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePageParam, paginationMeta } from "@/lib/pagination";
import { RunActions } from "@/components/payroll/run-actions";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  PENDING_APPROVAL: "outline",
  APPROVED: "default",
  POSTED: "default",
  VOID: "destructive",
};

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const ctx = await getTenantContext();
  const page = parsePageParam((await searchParams).page);
  const { skip, take, totalPages } = paginationMeta(
    page,
    await prisma.payrollRun.count({ where: { companyId: ctx.companyId } })
  );

  const runs = await prisma.payrollRun.findMany({
    where: { companyId: ctx.companyId },
    include: { payrollPeriod: true, _count: { select: { payslips: true } } },
    orderBy: { runNumber: "desc" },
    skip,
    take,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Payroll runs</h1>
        <CreateRunDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payroll runs yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run #</TableHead>
                  <TableHead>Cutoff</TableHead>
                  <TableHead>Pay date</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell>
                      <Link
                        href={`/dashboard/payroll/${r.id}`}
                        className="font-bold underline-offset-4 hover:underline text-primary"
                      >
                        #{r.runNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {r.payrollPeriod.cutoffStart.toLocaleDateString()} –{" "}
                      {r.payrollPeriod.cutoffEnd.toLocaleDateString()}
                    </TableCell>
                    <TableCell>{r.payrollPeriod.payDate.toLocaleDateString()}</TableCell>
                    <TableCell>{r._count.payslips} employees</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <RunActions runId={r.id} status={r.status} />
                        <Link href={`/dashboard/payroll/${r.id}`} className="text-xs font-medium text-primary hover:underline">
                          View &rarr;
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Pager page={page} totalPages={totalPages} basePath="/dashboard/payroll" />
        </CardContent>
      </Card>
    </div>
  );
}
