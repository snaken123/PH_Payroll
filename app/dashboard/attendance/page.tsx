import { prisma } from "@/lib/db";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";
import { AttendanceManager } from "@/components/attendance/attendance-manager";
import { EmploymentStatus } from "@/lib/generated/prisma/enums";

export default async function AttendancePage() {
  const ctx = await getTenantContext();

  const employees = await prisma.employee.findMany({
    where: withCompanyScope(ctx.companyId, {
      employmentStatus: { in: [EmploymentStatus.PROBATIONARY, EmploymentStatus.REGULAR] },
    }),
    select: { id: true, employeeNumber: true, firstName: true, lastName: true },
    orderBy: { lastName: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Attendance</h1>
      <AttendanceManager employees={employees} />
    </div>
  );
}
