import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";
import { CreateEmployeeDialog } from "@/components/employees/create-employee-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function EmployeesPage() {
  const ctx = await getTenantContext();

  const [employees, branches] = await Promise.all([
    prisma.employee.findMany({
      where: withCompanyScope(ctx.companyId),
      include: {
        branch: { select: { name: true } },
        compensationRecords: { where: { effectiveTo: null }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.companyBranch.findMany({
      where: withCompanyScope(ctx.companyId),
      select: { id: true, name: true },
      orderBy: { isHeadOffice: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Employees</h1>
        <CreateEmployeeDialog branches={branches} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roster</CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <p className="text-sm text-muted-foreground">No employees yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Basic rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Link href={`/dashboard/employees/${e.id}`} className="font-medium underline-offset-4 hover:underline">
                        {e.employeeNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {e.lastName}, {e.firstName}
                    </TableCell>
                    <TableCell>{e.branch.name}</TableCell>
                    <TableCell>{e.employeeType.replaceAll("_", " ")}</TableCell>
                    <TableCell>
                      <Badge variant={e.employmentStatus === "REGULAR" ? "default" : "secondary"}>
                        {e.employmentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {e.compensationRecords[0]
                        ? `₱${Number(e.compensationRecords[0].basicRate).toLocaleString()}`
                        : "—"}
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
