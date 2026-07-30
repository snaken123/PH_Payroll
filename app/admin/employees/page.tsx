import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pager } from "@/components/ui/pager";
import { SearchForm } from "@/components/ui/search-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePageParam, paginationMeta } from "@/lib/pagination";

export default async function AdminEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page: pageParam, q } = await searchParams;
  const page = parsePageParam(pageParam);
  const search = q?.trim() || undefined;

  const where = search
    ? {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { employeeNumber: { contains: search, mode: "insensitive" as const } },
          { company: { legalName: { contains: search, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const { skip, take, totalPages } = paginationMeta(page, await prisma.employee.count({ where }));

  const employees = await prisma.employee.findMany({
    where,
    include: {
      company: { select: { legalName: true } },
      branch: { select: { name: true } },
      compensationRecords: { where: { effectiveTo: null }, take: 1 },
    },
    orderBy: [{ company: { legalName: "asc" } }, { lastName: "asc" }],
    skip,
    take,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">All employees</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Across every company</CardTitle>
          <SearchForm action="/admin/employees" placeholder="Search name, employee #, or company…" defaultValue={search} />
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
                  <TableHead>Company</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Basic rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.employeeNumber}</TableCell>
                    <TableCell>
                      {e.lastName}, {e.firstName}
                    </TableCell>
                    <TableCell>{e.company.legalName}</TableCell>
                    <TableCell>{e.branch.name}</TableCell>
                    <TableCell>{e.positionTitle}</TableCell>
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
          <Pager page={page} totalPages={totalPages} basePath="/admin/employees" query={{ q: search }} />
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Read-only. To manage a specific company&apos;s employees, switch into that company from the dashboard
        header (visible after signing in with an active company selected), then use{" "}
        <Link href="/dashboard/employees" className="underline underline-offset-4">
          the regular Employees page
        </Link>
        .
      </p>
    </div>
  );
}
