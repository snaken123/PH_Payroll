import { prisma } from "@/lib/db";
import { CreateCompanyDialog } from "@/components/admin/create-company-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Building2Icon, UsersIcon, CheckCircle2Icon } from "lucide-react";

export default async function AdminCompaniesPage() {
  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { employees: true, branches: true } } },
  });

  const totalEmployees = companies.reduce((acc, c) => acc + c._count.employees, 0);
  const activeCompanies = companies.filter((c) => c.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Organizations &amp; Tenants"
        description="Super-admin tenant console — manage company onboarding, organizational branches, and cross-tenant memberships."
        actions={<CreateCompanyDialog />}
      />

      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          title="Total Tenant Companies"
          value={companies.length}
          subtitle="Registered organizations"
          icon={Building2Icon}
        />
        <MetricCard
          title="Active Tenants"
          value={activeCompanies}
          subtitle="Onboarded &amp; operational"
          icon={CheckCircle2Icon}
        />
        <MetricCard
          title="Platform Employees"
          value={totalEmployees}
          subtitle="Across all companies"
          icon={UsersIcon}
        />
      </div>

      <Card className="border-slate-800 bg-slate-900 shadow-xs">
        <CardHeader className="p-4 border-b border-slate-800 bg-slate-900/80 rounded-t-xl">
          <CardTitle className="text-sm font-bold text-slate-100 uppercase tracking-wider">Tenant Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {companies.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No tenant companies onboarded yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-900/90 border-slate-800">
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Company Name</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Company Code</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">BIR Region</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Branches</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Employees</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="font-bold text-xs text-slate-100">{company.legalName}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-300">{company.companyCode}</TableCell>
                    <TableCell className="text-xs text-slate-300">{company.region}</TableCell>
                    <TableCell className="text-xs text-slate-300">{company._count.branches} branches</TableCell>
                    <TableCell className="text-xs font-semibold text-slate-200">{company._count.employees} employees</TableCell>
                    <TableCell>
                      <StatusBadge status={company.status} />
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
