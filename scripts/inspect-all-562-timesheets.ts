import { prisma } from "../lib/db";

async function main() {
  const entries = await prisma.timesheetEntry.findMany({
    include: {
      employee: {
        select: {
          id: true,
          employeeNumber: true,
          firstName: true,
          lastName: true,
          companyId: true,
          company: { select: { legalName: true } },
        },
      },
    },
    orderBy: [{ workDate: "asc" }],
  });

  console.log(`Total timesheet entries in database: ${entries.length}`);

  for (const e of entries) {
    if (e.timeIn || e.timeOut || e.regularHours.toNumber() !== 8 || e.overtimeHours.toNumber() !== 0 || e.lateMinutes !== 0 || e.undertimeMinutes !== 0 || e.status !== "PRESENT") {
      console.log(
        `ID: ${e.id} | Date: ${e.workDate.toISOString().slice(0, 10)} | Emp: ${e.employee?.lastName}, ${e.employee?.firstName} (${e.employee?.employeeNumber}) | EmpCo: ${e.employee?.company.legalName} | TS_CompanyId: ${e.companyId} | Status: ${e.status} | In: ${e.timeIn?.toISOString() ?? "—"} | Out: ${e.timeOut?.toISOString() ?? "—"} | Reg: ${e.regularHours} | OT: ${e.overtimeHours} | Late: ${e.lateMinutes} | Under: ${e.undertimeMinutes}`
      );
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
