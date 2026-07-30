import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";
import { CreateEmployeeDialog } from "@/components/employees/create-employee-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Pager } from "@/components/ui/pager";
import { SearchForm } from "@/components/ui/search-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePageParam, paginationMeta } from "@/lib/pagination";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const ctx = await getTenantContext();
  const { page: pageParam, q } = await searchParams;
  const page = parsePageParam(pageParam);
  const search = q?.trim() || undefined;

  const where = withCompanyScope(
    ctx.companyId,
    search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { employeeNumber: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}
  );

  const { skip, take, totalPages } = paginationMeta(page, await prisma.employee.count({ where }));

  const [employees, branches] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: {
        branch: { select: { name: true } },
        compensationRecords: { where: { effectiveTo: null }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
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
        <div className="flex gap-2">
          <Link href="/dashboard/employees/bulk-edit" className={cn(buttonVariants({ variant: "outline" }))}>
            Bulk edit
          </Link>
          <CreateEmployeeDialog branches={branches} />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Roster</CardTitle>
          <SearchForm action="/dashboard/employees" placeholder="Search name or employee #…" defaultValue={search} />
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {search ? `No employees match "${search}".` : "No employees yet."}
            </p>
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
          <Pager page={page} totalPages={totalPages} basePath="/dashboard/employees" query={{ q: search }} />
        </CardContent>
      </Card>
    </div>
  );
}
