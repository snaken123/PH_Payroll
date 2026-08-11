import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/db/scoped";
import { SettingsClient } from "./settings-client";
import { PageHeader } from "@/components/ui/page-header";

export default async function SettingsPage() {
  const ctx = await getTenantContext();

  const [company, bankAccounts, employees] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
    }),
    prisma.companyBankAccount.findMany({
      where: { companyId: ctx.companyId },
      orderBy: [{ isDefault: "desc" }, { bankName: "asc" }],
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
      <PageHeader
        title={`Company Settings — ${company.legalName}`}
        description="Configure pay period cutoffs, standard work days, company tax registration, payroll disbursement bank accounts, and BIR Alphalist inclusions."
      />

      <SettingsClient company={company} bankAccounts={bankAccounts} employees={employees} />
    </div>
  );
}
