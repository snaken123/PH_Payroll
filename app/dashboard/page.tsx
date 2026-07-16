import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const ctx = await getTenantContext();

  const [company, employeeCount, branchCount] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: ctx.companyId } }),
    prisma.employee.count({ where: withCompanyScope(ctx.companyId) }),
    prisma.companyBranch.count({ where: withCompanyScope(ctx.companyId) }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{company.legalName}</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Employees</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{employeeCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Branches</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{branchCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">TIN</CardTitle>
          </CardHeader>
          <CardContent className="text-lg">{company.tin}</CardContent>
        </Card>
      </div>
    </div>
  );
}
