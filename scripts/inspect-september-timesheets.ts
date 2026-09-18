import { prisma } from "../lib/db";

async function inspectTimesheets() {
  console.log("Fetching all timesheet entries in September 2026...");
  const entries = await prisma.timesheetEntry.findMany({
    where: {
      workDate: {
        gte: new Date("2026-09-01T00:00:00Z"),
        lte: new Date("2026-09-15T23:59:59Z"),
      },
    },
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

  console.log(`Total timesheet entries in Sept 1-15: ${entries.length}`);

  const withTimes = entries.filter((e) => e.timeIn !== null || e.timeOut !== null);
  console.log(`Entries with timeIn/timeOut: ${withTimes.length}`);

  for (const e of withTimes) {
    console.log(
      `Date: ${e.workDate.toISOString().slice(0, 10)} | Emp: ${e.employee.lastName}, ${e.employee.firstName} (${e.employee.employeeNumber}) | EmpCo: ${e.employee.company.legalName} (${e.employee.companyId}) | TimesheetCo: ${e.companyId} | In: ${e.timeIn?.toISOString()} | Out: ${e.timeOut?.toISOString()} | Status: ${e.status} | Reg: ${e.regularHours} | OT: ${e.overtimeHours}`
    );
  }

  // Also check if there are any timesheet entries where e.companyId != e.employee.companyId
  const mismatched = entries.filter((e) => e.companyId !== e.employee.companyId);
  console.log(`Mismatched companyId entries: ${mismatched.length}`);
  for (const m of mismatched) {
    console.log(
      `MISMATCH -> Date: ${m.workDate.toISOString().slice(0, 10)} | Emp: ${m.employee.lastName}, ${m.employee.firstName} | EmpCo: ${m.employee.companyId} | TimesheetCo: ${m.companyId}`
    );
  }
}

inspectTimesheets()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
