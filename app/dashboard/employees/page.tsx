import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";
import { CreateEmployeeDialog } from "@/components/employees/create-employee-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Pager } from "@/components/ui/pager";
import { SearchForm } from "@/components/ui/search-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePageParam, paginationMeta } from "@/lib/pagination";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { UsersIcon, UserCheckIcon, ClockIcon, Building2Icon, ArrowRightIcon, Edit3Icon } from "lucide-react";

import { EmploymentStatus } from "@/lib/generated/prisma/enums";

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

  const totalCount = await prisma.employee.count({ where: withCompanyScope(ctx.companyId) });
  const { skip, take, totalPages } = paginationMeta(page, await prisma.employee.count({ where }));

  const [employees, branches, regularCount, probationaryCount] = await Promise.all([
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
    prisma.employee.count({
      where: withCompanyScope(ctx.companyId, { employmentStatus: EmploymentStatus.REGULAR }),
    }),
    prisma.employee.count({
      where: withCompanyScope(ctx.companyId, { employmentStatus: EmploymentStatus.PROBATIONARY }),
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Employees"
        description="Manage your organization's employee directory, compensation records, and employment statuses."
        actions={
          <>
            <Link
              href="/dashboard/employees/bulk-edit"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 text-xs font-semibold")}
            >
              <Edit3Icon className="size-3.5 text-slate-500" />
              Bulk Edit
            </Link>
            <CreateEmployeeDialog branches={branches} />
          </>
        }
      />

      {/* Summary KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Employees"
          value={totalCount}
          subtitle="Registered on company roster"
          icon={UsersIcon}
        />
        <MetricCard
          title="Regular Status"
          value={regularCount}
          subtitle="Full benefits & statutory coverage"
          icon={UserCheckIcon}
        />
        <MetricCard
          title="Probationary"
          value={probationaryCount}
          subtitle="Under evaluation period"
          icon={ClockIcon}
        />
        <MetricCard
          title="Active Branches"
          value={branches.length}
          subtitle="Operational head office & locations"
          icon={Building2Icon}
        />
      </div>

      {/* Main Roster Data Table Card */}
      <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-t-xl">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Employee Directory</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {employees.length} of {totalCount} records
            </p>
          </div>
          <div className="w-full sm:w-auto">
            <SearchForm action="/dashboard/employees" placeholder="Search name or employee #…" defaultValue={search} />
          </div>
        </div>

        <CardContent className="p-0">
          {employees.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              {search ? `No employees match "${search}".` : "No employees added to the directory yet."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-slate-900/80 hover:bg-slate-50/80">
                    <TableHead className="w-[120px] text-xs font-bold uppercase tracking-wider text-slate-500">Employee #</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Employee Name</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Branch</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Pay Basis / Type</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Basic Rate</TableHead>
                    <TableHead className="w-[80px] text-right text-xs font-bold uppercase tracking-wider text-slate-500">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((e) => {
                    const activeComp = e.compensationRecords[0];
                    return (
                      <TableRow key={e.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <TableCell className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {e.employeeNumber}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/employees/${e.id}`}
                            className="font-bold text-sm text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            {e.lastName}, {e.firstName} {e.middleName ? `${e.middleName[0]}.` : ""}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                          {e.branch.name}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                          {e.employeeType.replaceAll("_", " ")}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={e.employmentStatus} />
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                          {activeComp
                            ? `₱${Number(activeComp.basicRate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/dashboard/employees/${e.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            View <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800">
          <Pager page={page} totalPages={totalPages} basePath="/dashboard/employees" query={{ q: search }} />
        </div>
      </Card>
    </div>
  );
}
