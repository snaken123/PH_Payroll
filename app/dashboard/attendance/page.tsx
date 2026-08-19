import { prisma } from "@/lib/db";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";
import { AttendanceManager } from "@/components/attendance/attendance-manager";
import { AttendanceGrid } from "@/components/attendance/attendance-grid";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmploymentStatus } from "@/lib/generated/prisma/enums";
import { PageHeader } from "@/components/ui/page-header";
import { GridIcon, UserIcon } from "lucide-react";

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
      <PageHeader
        title="Attendance & Time Records"
        description="Record daily work hours, tardiness, undertime, and overtime facts for semi-monthly payroll proration."
      />

      <Tabs defaultValue="grid" className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          <TabsTrigger value="grid" className="gap-1.5 text-xs font-semibold">
            <GridIcon className="size-3.5" /> Spreadsheet Cutoff Grid
          </TabsTrigger>
          <TabsTrigger value="employee" className="gap-1.5 text-xs font-semibold">
            <UserIcon className="size-3.5" /> By Employee Record
          </TabsTrigger>
        </TabsList>
        <TabsContent value="grid">
          <AttendanceGrid />
        </TabsContent>
        <TabsContent value="employee">
          <AttendanceManager employees={employees} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
