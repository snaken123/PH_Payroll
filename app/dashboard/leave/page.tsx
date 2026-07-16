import { prisma } from "@/lib/db";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";
import { LeaveManager } from "@/components/leave/leave-manager";
import { EmploymentStatus } from "@/lib/generated/prisma/enums";

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
      <h1 className="text-2xl font-semibold">Leave</h1>
      <LeaveManager employees={employees} leaveTypes={leaveTypes} />
    </div>
  );
}
