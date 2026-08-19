import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";
import { CreateContractorDialog } from "@/components/contractors/create-contractor-dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Pager } from "@/components/ui/pager";
import { SearchForm } from "@/components/ui/search-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePageParam, paginationMeta } from "@/lib/pagination";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricCard } from "@/components/ui/metric-card";
import { BriefcaseIcon, CheckCircle2Icon, ArrowRightIcon } from "lucide-react";
import { ContractorStatus } from "@/lib/generated/prisma/enums";

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

  const totalCount = await prisma.contractor.count({ where: withCompanyScope(ctx.companyId) });
  const { skip, take, totalPages } = paginationMeta(page, await prisma.contractor.count({ where }));

  const [contractors, activeCount] = await Promise.all([
    prisma.contractor.findMany({
      where,
      include: { _count: { select: { payments: true } } },
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    prisma.contractor.count({
      where: withCompanyScope(ctx.companyId, { status: ContractorStatus.ACTIVE }),
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contractors &amp; Expanded Withholding Tax"
        description="Manage freelancers and independent contractors under BIR Expanded Withholding Tax (BIR Form 2307) — separate from employee payroll."
        actions={<CreateContractorDialog />}
      />

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          title="Total Contractors"
          value={totalCount}
          subtitle="Registered vendor accounts"
          icon={BriefcaseIcon}
        />
        <MetricCard
          title="Active Engagements"
          value={activeCount}
          subtitle="Subject to BIR Form 2307 EWT"
          icon={CheckCircle2Icon}
        />
      </div>

      <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
        <CardHeader className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-t-xl">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Contractor Directory</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {contractors.length} of {totalCount} records
            </p>
          </div>
          <div className="w-full sm:w-auto">
            <SearchForm action="/dashboard/contractors" placeholder="Search name or TIN…" defaultValue={search} />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {contractors.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              {search ? `No contractors match "${search}".` : "No contractors registered yet."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 dark:bg-slate-900/80">
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Contractor Name</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">TIN Number</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">ATC Code</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Default EWT Rate</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Payments</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contractors.map((c) => (
                  <TableRow key={c.id} className="group hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <TableCell className="font-bold text-xs">
                      <Link href={`/dashboard/contractors/${c.id}`} className="text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400">
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-300">{c.tin}</TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">{c.atcCode}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                      {(Number(c.defaultEwtRate) * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-300">{c._count.payments} payments</TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/contractors/${c.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Details <ArrowRightIcon className="size-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800">
          <Pager page={page} totalPages={totalPages} basePath="/dashboard/contractors" query={{ q: search }} />
        </div>
      </Card>
    </div>
  );
}
