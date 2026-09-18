import { prisma } from "../lib/db";

async function inspectAllTimesheets() {
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
    orderBy: [{ employeeId: "asc" }, { workDate: "asc" }],
  });

  console.log(`Total timesheet entries in Sept 1-15: ${entries.length}`);

  const byEmp = new Map<string, typeof entries>();
  for (const e of entries) {
    const key = `${e.employee.lastName}, ${e.employee.firstName} (${e.employee.employeeNumber}) [Company: ${e.employee.company.legalName}]`;
    if (!byEmp.has(key)) byEmp.set(key, []);
    byEmp.get(key)!.push(e);
  }

  for (const [empName, empEntries] of byEmp.entries()) {
    console.log(`\n=== ${empName} (${empEntries.length} entries) ===`);
    for (const e of empEntries) {
      const dateStr = e.workDate.toISOString().slice(0, 10);
      const inStr = e.timeIn ? e.timeIn.toISOString() : "—";
      const outStr = e.timeOut ? e.timeOut.toISOString() : "—";
      console.log(
        `  ${dateStr}: Status=${e.status} | In=${inStr} | Out=${outStr} | Reg=${e.regularHours} | OT=${e.overtimeHours} | Late=${e.lateMinutes}`
      );
    }
  }
}

inspectAllTimesheets()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
