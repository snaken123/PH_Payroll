import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";
import { CreateContractorDialog } from "@/components/contractors/create-contractor-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pager } from "@/components/ui/pager";
import { SearchForm } from "@/components/ui/search-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePageParam, paginationMeta } from "@/lib/pagination";

export default async function ContractorsPage({
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
            { name: { contains: search, mode: "insensitive" as const } },
            { tin: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}
  );

  const { skip, take, totalPages } = paginationMeta(page, await prisma.contractor.count({ where }));

  const contractors = await prisma.contractor.findMany({
    where,
    include: { _count: { select: { payments: true } } },
    orderBy: { name: "asc" },
    skip,
    take,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contractors</h1>
          <p className="text-sm text-muted-foreground">
            Freelancers and contractors under expanded withholding tax — separate from employee payroll.
          </p>
        </div>
        <CreateContractorDialog />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Roster</CardTitle>
          <SearchForm action="/dashboard/contractors" placeholder="Search name or TIN…" defaultValue={search} />
        </CardHeader>
        <CardContent>
          {contractors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {search ? `No contractors match "${search}".` : "No contractors yet."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>TIN</TableHead>
                  <TableHead>ATC Code</TableHead>
                  <TableHead>EWT Rate</TableHead>
                  <TableHead>Payments</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contractors.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/dashboard/contractors/${c.id}`} className="font-medium underline-offset-4 hover:underline">
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell>{c.tin}</TableCell>
                    <TableCell>{c.atcCode}</TableCell>
                    <TableCell>{(Number(c.defaultEwtRate) * 100).toFixed(1)}%</TableCell>
                    <TableCell>{c._count.payments}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "ACTIVE" ? "default" : "secondary"}>{c.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Pager page={page} totalPages={totalPages} basePath="/dashboard/contractors" query={{ q: search }} />
        </CardContent>
      </Card>
    </div>
  );
}
