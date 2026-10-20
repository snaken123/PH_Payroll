import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/db/scoped";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { CheckRegisterClient } from "@/components/checks/check-register-client";

export const metadata = {
  title: "Check Register | Philippine Payroll System",
  description: "Disbursement check register across payroll runs, separation pay, and statutory remittances.",
};

export default async function CheckRegisterPage() {
  const ctx = await getTenantContext();

  const canViewChecks =
    ctx.isSuperAdmin ||
    hasPermission(ctx.permissions, "payroll.compute", ctx.platformRole) ||
    hasPermission(ctx.permissions, "payroll.post", ctx.platformRole) ||
    hasPermission(ctx.permissions, "reports.view", ctx.platformRole);

  if (!canViewChecks) {
    redirect("/dashboard");
  }

  const canManage =
    ctx.isSuperAdmin ||
    hasPermission(ctx.permissions, "payroll.post", ctx.platformRole) ||
    hasPermission(ctx.permissions, "payroll.compute", ctx.platformRole);

  const bankAccounts = await prisma.companyBankAccount.findMany({
    where: { companyId: ctx.companyId },
    select: { id: true, bankName: true, accountNumber: true, nickname: true },
    orderBy: [{ isDefault: "desc" }, { bankName: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Check Register"
        description="Unified ledger of all check payments disbursed from Payroll Runs, Separation & Final Pay, and Statutory Remittances."
      />

      <CheckRegisterClient
        initialBankAccounts={bankAccounts}
        canManage={canManage}
      />
    </div>
  );
}
