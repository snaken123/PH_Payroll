import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";
import { CreateEmployeeDialog } from "@/components/employees/create-employee-dialog";
import { DeleteEmployeeDialog } from "@/components/employees/delete-employee-dialog";
import { DeletionAuditDialog } from "@/components/employees/deletion-audit-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Pager } from "@/components/ui/pager";
import { SearchForm } from "@/components/ui/search-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePageParam, paginationMeta } from "@/lib/pagination";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SortableHeader } from "@/components/ui/sortable-header";
import { UsersIcon, UserCheckIcon, ClockIcon, Building2Icon, Edit3Icon, FileTextIcon } from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import { ShowResignedToggle } from "@/components/employees/show-resigned-toggle";
import { EmploymentStatus } from "@/lib/generated/prisma/enums";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; sort?: string; order?: "asc" | "desc"; showResigned?: string }>;
}) {
  const ctx = await getTenantContext();
  const resolvedSearchParams = await searchParams;
  const { page: pageParam, q, sort, order, showResigned } = resolvedSearchParams;
  const includeResigned = showResigned === "true";
  const page = parsePageParam(pageParam);
  const search = q?.trim() || undefined;
  const sortOrder = order === "desc" ? "desc" : "asc";

  const where = withCompanyScope(
    ctx.companyId,
    {
      isDeleted: false,
      ...(!includeResigned ? { employmentStatus: { not: EmploymentStatus.RESIGNED } } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" as const } },
              { lastName: { contains: search, mode: "insensitive" as const } },
              { employeeNumber: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    }
  );

  const canViewCompensation = ctx.isSuperAdmin || ctx.permissions.includes("employee.view_compensation");
  const canManageEmployee = ctx.isSuperAdmin || hasPermission(ctx.permissions, "employee.manage", ctx.platformRole);
  const canDeleteEmployee = ctx.isSuperAdmin || hasPermission(ctx.permissions, "employee.delete", ctx.platformRole);

  let prismaOrderBy: any = { createdAt: "desc" };
  if (sort === "employeeNumber") {
    prismaOrderBy = { employeeNumber: sortOrder };
  } else if (sort === "name") {
    prismaOrderBy = [{ lastName: sortOrder }, { firstName: sortOrder }];
  } else if (sort === "branch") {
    prismaOrderBy = { branch: { name: sortOrder } };
  } else if (sort === "type") {
    prismaOrderBy = { employeeType: sortOrder };
  } else if (sort === "status") {
    prismaOrderBy = { employmentStatus: sortOrder };
  }

  const filteredCount = await prisma.employee.count({ where });
  const totalCount = await prisma.employee.count({
    where: withCompanyScope(ctx.companyId, {
      isDeleted: false,
      ...(!includeResigned ? { employmentStatus: { not: EmploymentStatus.RESIGNED } } : {}),
    }),
  });
  const { skip, take, totalPages } = paginationMeta(page, filteredCount);

  const [rawEmployees, branches, regularCount, probationaryCount] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: {
        branch: { select: { name: true } },
        compensationRecords: { where: { effectiveTo: null }, take: 1 },
      },
      ...(sort !== "basicRate" || !canViewCompensation ? { orderBy: prismaOrderBy, skip, take } : {}),
    }),
    prisma.companyBranch.findMany({
      where: withCompanyScope(ctx.companyId),
      select: { id: true, name: true },
      orderBy: { isHeadOffice: "desc" },
    }),
    prisma.employee.count({
      where: withCompanyScope(ctx.companyId, { employmentStatus: EmploymentStatus.REGULAR, isDeleted: false }),
    }),
    prisma.employee.count({
      where: withCompanyScope(ctx.companyId, { employmentStatus: EmploymentStatus.PROBATIONARY, isDeleted: false }),
    }),
  ]);

  let employees = rawEmployees;
  if (sort === "basicRate" && canViewCompensation) {
    employees = [...rawEmployees].sort((a, b) => {
      const rateA = Number(a.compensationRecords[0]?.basicRate ?? 0);
      const rateB = Number(b.compensationRecords[0]?.basicRate ?? 0);
      return sortOrder === "asc" ? rateA - rateB : rateB - rateA;
    });
    employees = employees.slice(skip, skip + take);
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Employees"
        description="Manage your organization's employee directory, compensation records, and employment statuses."
        actions={
          <>
            <DeletionAuditDialog disabled={!canDeleteEmployee} />
            {canManageEmployee ? (
              <Link
                href="/dashboard/employees/bulk-edit"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 text-xs font-semibold")}
              >
                <Edit3Icon className="size-3.5 text-slate-500" />
                Bulk Edit
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled className="gap-1.5 text-xs font-semibold">
                <Edit3Icon className="size-3.5 text-slate-500" />
                Bulk Edit
              </Button>
            )}
            <CreateEmployeeDialog branches={branches} disabled={!canManageEmployee} />
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
      <Card className="border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)] dark:border-slate-800">
        <div className="p-3.5 border-b border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/60 rounded-t-xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Employee Directory</h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {filteredCount} {filteredCount === 1 ? "record" : "records"}
            </span>
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block" />
            <ShowResignedToggle defaultChecked={includeResigned} />
          </div>
          <div className="w-full sm:w-auto">
            <SearchForm
              action="/dashboard/employees"
              placeholder="Search name or employee #…"
              defaultValue={search}
              hiddenParams={{ sort, order, ...(includeResigned ? { showResigned: "true" } : {}) }}
            />
          </div>
        </div>

        <CardContent className="p-0">
          {employees.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
              {search ? `No employees match "${search}".` : "No employees added to the directory yet."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">
                      <SortableHeader
                        label="Employee #"
                        sortKey="employeeNumber"
                        currentSort={sort}
                        currentOrder={sortOrder}
                        basePath="/dashboard/employees"
                        query={{ q: search, ...(includeResigned ? { showResigned: "true" } : {}) }}
                      />
                    </TableHead>
                    <TableHead>
                      <SortableHeader
                        label="Employee Name"
                        sortKey="name"
                        currentSort={sort}
                        currentOrder={sortOrder}
                        basePath="/dashboard/employees"
                        query={{ q: search, ...(includeResigned ? { showResigned: "true" } : {}) }}
                      />
                    </TableHead>
                    <TableHead>
                      <SortableHeader
                        label="Branch"
                        sortKey="branch"
                        currentSort={sort}
                        currentOrder={sortOrder}
                        basePath="/dashboard/employees"
                        query={{ q: search, ...(includeResigned ? { showResigned: "true" } : {}) }}
                      />
                    </TableHead>
                    <TableHead>
                      <SortableHeader
                        label="Pay Basis / Type"
                        sortKey="type"
                        currentSort={sort}
                        currentOrder={sortOrder}
                        basePath="/dashboard/employees"
                        query={{ q: search, ...(includeResigned ? { showResigned: "true" } : {}) }}
                      />
                    </TableHead>
                    <TableHead>
                      <SortableHeader
                        label="Status"
                        sortKey="status"
                        currentSort={sort}
                        currentOrder={sortOrder}
                        basePath="/dashboard/employees"
                        query={{ q: search, ...(includeResigned ? { showResigned: "true" } : {}) }}
                      />
                    </TableHead>
                    <TableHead className="text-right">
                      {canViewCompensation ? (
                        <SortableHeader
                          label="Basic Rate"
                          sortKey="basicRate"
                          currentSort={sort}
                          currentOrder={sortOrder}
                          basePath="/dashboard/employees"
                          query={{ q: search, ...(includeResigned ? { showResigned: "true" } : {}) }}
                          align="right"
                        />
                      ) : (
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Basic Rate</span>
                      )}
                    </TableHead>
                    <TableHead className="w-[110px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((e) => {
                    const activeComp = e.compensationRecords[0];
                    return (
                      <TableRow key={e.id} className="group hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <TableCell className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                          {e.employeeNumber}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200/90 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 select-none">
                              {e.firstName?.[0] ?? ""}{e.lastName?.[0] ?? ""}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/dashboard/employees/${e.id}`}
                                className="font-bold text-xs text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate block"
                              >
                                {e.lastName}, {e.firstName} {e.middleName ? `${e.middleName[0]}.` : ""}
                              </Link>
                              {e.positionTitle && (
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                                  {e.positionTitle}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                          {e.branch.name}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                          {e.employeeType.replaceAll("_", " ")}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={e.employmentStatus} size="sm" />
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-xs text-slate-900 dark:text-slate-100 tabular-nums">
                          {canViewCompensation ? (
                            activeComp
                              ? `₱${Number(activeComp.basicRate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : "—"
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600 font-mono tracking-widest text-xs" title="Restricted - Requires Salary Access">
                              ••••••
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/dashboard/employees/${e.id}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100/80 hover:bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700 text-xs font-semibold transition-colors"
                            >
                              <FileTextIcon className="size-3 text-slate-500" /> 201 File
                            </Link>
                            <DeleteEmployeeDialog
                              employeeId={e.id}
                              employeeName={`${e.firstName} ${e.lastName}`}
                              employeeNumber={e.employeeNumber}
                              disabled={!canDeleteEmployee}
                              iconOnly
                            />
                          </div>
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
          <Pager page={page} totalPages={totalPages} basePath="/dashboard/employees" query={{ q: search, sort, order: sortOrder, ...(includeResigned ? { showResigned: "true" } : {}) }} />
        </div>
      </Card>
    </div>
  );
}
