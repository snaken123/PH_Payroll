import { prisma } from "@/lib/db";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";
import { LeaveManager } from "@/components/leave/leave-manager";
import { EmploymentStatus } from "@/lib/generated/prisma/enums";
import { PageHeader } from "@/components/ui/page-header";

export default async function LeavePage() {
  const ctx = await getTenantContext();

  const [employees, leaveTypes] = await Promise.all([
    prisma.employee.findMany({
      where: withCompanyScope(ctx.companyId, {
        employmentStatus: { in: [EmploymentStatus.PROBATIONARY, EmploymentStatus.REGULAR] },
      }),
      select: { id: true, employeeNumber: true, firstName: true, lastName: true },
      orderBy: { lastName: "asc" },
    }),
    prisma.leaveType.findMany({
      where: withCompanyScope(ctx.companyId),
      select: { id: true, name: true },
      orderBy: { isStatutory: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Management &amp; Approvals"
        description="Process employee leave requests (SIL, Vacation, Sick, Maternity, Paternity) and track annual leave balances."
      />
      <LeaveManager employees={employees} leaveTypes={leaveTypes} />
    </div>
  );
}
