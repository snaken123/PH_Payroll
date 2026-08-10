import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/db/scoped";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const ctx = await getTenantContext();

  const [company, employees] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
    }),
    prisma.employee.findMany({
      where: { companyId: ctx.companyId },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        tin: true,
        employmentStatus: true,
        isIncludedInAlphalist: true,
      },
      orderBy: { lastName: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Company Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure pay period cutoffs, company tax details, theme preferences, and BIR Alphalist inclusions for {company.legalName}.
        </p>
      </div>

      <SettingsClient company={company} employees={employees} />
    </div>
  );
}
