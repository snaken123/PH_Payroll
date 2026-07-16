import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";
import { CreateContractorDialog } from "@/components/contractors/create-contractor-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ContractorsPage() {
  const ctx = await getTenantContext();

  const contractors = await prisma.contractor.findMany({
    where: withCompanyScope(ctx.companyId),
    include: { _count: { select: { payments: true } } },
    orderBy: { name: "asc" },
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
        <CardHeader>
          <CardTitle>Roster</CardTitle>
        </CardHeader>
        <CardContent>
          {contractors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contractors yet.</p>
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
        </CardContent>
      </Card>
    </div>
  );
}
