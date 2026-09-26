import { prisma } from "../lib/db";
import { calculateTimesheetHours } from "../lib/attendance/calculateHours";
import { extractTimeOfDay } from "../lib/validations/attendance";

async function main() {
  console.log("Fetching companies...");
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      legalName: true,
      attendanceStandardTimeIn: true,
      attendanceStandardTimeOut: true,
      attendanceLunchBreakMinutes: true,
      attendanceLateGracePeriodMinutes: true,
      attendanceOtGracePeriodMinutes: true,
      attendanceFlexi1WindowStart: true,
      attendanceFlexi1WindowEnd: true,
      attendanceFlexi1LateGracePeriodMinutes: true,
    },
  });

  const companyMap = new Map(companies.map((c) => [c.id, c]));

  console.log("Fetching employees...");
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      scheduleType: true,
      companyId: true,
    },
  });
  const employeeMap = new Map(employees.map((e) => [e.id, e]));

  const startDate = new Date("2026-09-01T00:00:00.000Z");
  const endDate = new Date("2026-09-15T23:59:59.999Z");

  console.log("Fetching timesheet entries for 2026-09-01 to 2026-09-15...");
  const entries = await prisma.timesheetEntry.findMany({
    where: {
      workDate: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  console.log(`Found ${entries.length} entries in range Sept 1 to Sept 15.`);

  let updatedCount = 0;

  for (const entry of entries) {
    const emp = employeeMap.get(entry.employeeId);
    const comp = companyMap.get(entry.companyId);

    const timeInStr = entry.timeIn ? extractTimeOfDay(entry.timeIn.toISOString()) : "";
    const timeOutStr = entry.timeOut ? extractTimeOfDay(entry.timeOut.toISOString()) : "";

    const calc = calculateTimesheetHours({
      scheduleType: emp?.scheduleType,
      timeIn: timeInStr,
      timeOut: timeOutStr,
      config: comp,
    });

    let newRegHours = calc.regularHours;
    let newOtHours = calc.overtimeHours;
    let newLateMins = calc.lateMinutes;
    let newUnderMins = calc.undertimeMinutes;

    if (entry.status === "REST_DAY") {
      newRegHours = 0;
      if (!entry.timeIn && !entry.timeOut) newOtHours = 0;
    } else if (entry.status === "HOLIDAY") {
      newRegHours = 0;
      if (!entry.timeIn && !entry.timeOut) newOtHours = 0;
    } else if (entry.status === "ABSENT") {
      newRegHours = 0;
      newOtHours = 0;
    }

    await prisma.timesheetEntry.update({
      where: { id: entry.id },
      data: {
        regularHours: newRegHours,
        overtimeHours: newOtHours,
        lateMinutes: newLateMins,
        undertimeMinutes: newUnderMins,
      },
    });

    updatedCount++;
    console.log(
      `Updated entry ${entry.id} (${emp?.lastName}, ${emp?.firstName} on ${entry.workDate.toISOString().slice(0, 10)}): Status=${entry.status}, In=${timeInStr || "N/A"}, Out=${timeOutStr || "N/A"} => Reg=${newRegHours}, OT=${newOtHours}, Late=${newLateMins}, Under=${newUnderMins}`
    );
  }

  console.log(`Recomputation complete! Updated ${updatedCount} entries.`);
}

main()
  .catch((e) => {
    console.error("Error during recomputation:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
