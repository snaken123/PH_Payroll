import { prisma } from "../lib/db";

async function dumpAllTimesheets() {
  console.log("Fetching ALL timesheet entries from database...");
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

  const withTimes = entries.filter((e) => e.timeIn !== null || e.timeOut !== null);
  console.log(`Entries with non-null timeIn/timeOut in entire DB: ${withTimes.length}`);

  for (const e of withTimes) {
    console.log(
      `ID: ${e.id} | Date: ${e.workDate.toISOString().slice(0, 10)} | Emp: ${e.employee.lastName}, ${e.employee.firstName} (${e.employee.employeeNumber}) | EmpCo: ${e.employee.company.legalName} | TS_CompanyId: ${e.companyId} | In: ${e.timeIn?.toISOString()} | Out: ${e.timeOut?.toISOString()} | Reg: ${e.regularHours} | OT: ${e.overtimeHours}`
    );
  }
}

dumpAllTimesheets()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
