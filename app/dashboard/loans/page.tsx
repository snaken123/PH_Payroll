import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING_APPROVAL: "outline",
  ACTIVE: "default",
  COMPLETED: "secondary",
  REJECTED: "destructive",
  CANCELLED: "destructive",
};

export default async function CompanyLoansPage() {
  const ctx = await getTenantContext();

  const loans = await prisma.loan.findMany({
    where: withCompanyScope(ctx.companyId, {}),
    include: {
      employee: {
        select: { id: true, employeeNumber: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Company Loans & Cash Advances</h1>
          <p className="text-sm text-muted-foreground">
            Company-wide register of active loans, SSS/Pag-IBIG government loans, and cash advance requests.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Loans</CardTitle>
          <CardDescription>
            Loan deductions are automatically deducted on eligible payroll cutoffs and capped so net pay never goes negative.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loans.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No loans or cash advances recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Loan Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Principal Amount</TableHead>
                  <TableHead>Installment</TableHead>
                  <TableHead>Remaining Balance</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/employees/${loan.employee.id}`} className="hover:underline">
                        {loan.employee.lastName}, {loan.employee.firstName} ({loan.employee.employeeNumber})
                      </Link>
                    </TableCell>
                    <TableCell>{loan.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{loan.category.replaceAll("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>₱{Number(loan.principal).toLocaleString()}</TableCell>
                    <TableCell>₱{Number(loan.installmentAmount).toLocaleString()}</TableCell>
                    <TableCell className="font-semibold">₱{Number(loan.remainingBalance).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{loan.deductionFrequency.replaceAll("_", " ")}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[loan.status] ?? "secondary"}>
                        {loan.status.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/employees/${loan.employee.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        View profile &rarr;
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
