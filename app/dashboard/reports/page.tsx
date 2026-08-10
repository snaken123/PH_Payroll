import { prisma } from "@/lib/db";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";
import { ReportsManager } from "@/components/reports/reports-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmploymentStatus } from "@/lib/generated/prisma/enums";

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  PAYSLIP: "Payslip",
  PAYROLL_REGISTER: "Payroll Register",
  SSS_R3: "SSS R-3",
  PHILHEALTH_RF1: "PhilHealth RF-1",
  PAGIBIG_MCRF: "Pag-IBIG MCRF",
  FORM_1601C: "BIR 1601-C",
  FORM_2316: "BIR 2316",
  THIRTEENTH_MONTH_REPORT: "13th Month Report",
  BIR_ALPHALIST: "BIR Alphalist (1604-C)",
};

export default async function ReportsPage() {
  const ctx = await getTenantContext();

  const [postedRuns, employees, recentDocuments] = await Promise.all([
    prisma.payrollRun.findMany({
      where: { companyId: ctx.companyId, status: "POSTED" },
      include: { payrollPeriod: true },
      orderBy: { runNumber: "desc" },
    }),
    prisma.employee.findMany({
      where: withCompanyScope(ctx.companyId, {
        employmentStatus: { in: [EmploymentStatus.PROBATIONARY, EmploymentStatus.REGULAR] },
      }),
      select: { id: true, employeeNumber: true, firstName: true, lastName: true },
      orderBy: { lastName: "asc" },
    }),
    prisma.generatedDocument.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { generatedAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Statutory Reports</h1>

      <ReportsManager
        postedRuns={postedRuns.map((r) => ({
          id: r.id,
          runNumber: r.runNumber,
          cutoffStart: r.payrollPeriod.cutoffStart.toLocaleDateString(),
          cutoffEnd: r.payrollPeriod.cutoffEnd.toLocaleDateString(),
        }))}
        employees={employees}
      />

      <Card>
        <CardHeader>
          <CardTitle>Recently generated</CardTitle>
        </CardHeader>
        <CardContent>
          {recentDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reports generated yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Generated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentDocuments.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{DOCUMENT_TYPE_LABELS[d.documentType] ?? d.documentType}</TableCell>
                    <TableCell>{d.generatedAt.toLocaleString()}</TableCell>
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
