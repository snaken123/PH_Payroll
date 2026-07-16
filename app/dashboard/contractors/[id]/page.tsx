import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { assertCompanyId, getTenantContext } from "@/lib/db/scoped";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreatePaymentDialog } from "@/components/contractors/create-payment-dialog";
import { PaymentActions } from "@/components/contractors/payment-actions";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  DRAFT: "secondary",
  POSTED: "default",
  VOID: "destructive",
};

export default async function ContractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getTenantContext();

  const contractor = await prisma.contractor.findUnique({
    where: { id },
    include: { payments: { orderBy: { paymentNumber: "desc" } } },
  });

  if (!contractor) notFound();
  try {
    assertCompanyId(ctx, contractor.companyId);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{contractor.name}</h1>
          <p className="text-sm text-muted-foreground">
            TIN {contractor.tin} · {contractor.atcCode} · EWT {(Number(contractor.defaultEwtRate) * 100).toFixed(1)}%
          </p>
        </div>
        <Badge variant={contractor.status === "ACTIVE" ? "default" : "secondary"}>{contractor.status}</Badge>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payments</CardTitle>
          <CreatePaymentDialog contractorId={contractor.id} defaultEwtRate={Number(contractor.defaultEwtRate)} />
        </CardHeader>
        <CardContent>
          {contractor.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>EWT</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contractor.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.paymentNumber}</TableCell>
                    <TableCell>{p.paymentDate.toLocaleDateString()}</TableCell>
                    <TableCell>₱{Number(p.grossAmount).toLocaleString()}</TableCell>
                    <TableCell>₱{Number(p.ewtAmount).toLocaleString()}</TableCell>
                    <TableCell className="font-medium">₱{Number(p.netAmount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[p.status] ?? "secondary"}>{p.status}</Badge>
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      <PaymentActions paymentId={p.id} status={p.status} />
                      {p.status === "POSTED" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          render={<a href={`/api/reports/2307/${p.id}`} target="_blank" />}
                        >
                          2307 PDF
                        </Button>
                      )}
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
