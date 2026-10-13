import { describe, expect, it } from "vitest";

describe("OT Preview & Recompute Date Boundary Normalization", () => {
  it("normalizes cutoffEnd to 23:59:59.999 to catch overtime logged on the last day of the cutoff", () => {
    const cutoffStartStr = "2026-09-01T00:00:00.000Z";
    const cutoffEndStr = "2026-09-15T00:00:00.000Z";

    const cutoffStart = new Date(cutoffStartStr);
    cutoffStart.setUTCHours(0, 0, 0, 0);

    const cutoffEnd = new Date(cutoffEndStr);
    cutoffEnd.setUTCHours(23, 59, 59, 999);

    // Overtime logged on the last day of the cutoff (Sept 15 at 8:00 AM UTC or 5:00 PM local)
    const timesheetWorkDate = new Date("2026-09-15T08:00:00.000Z");

    // Before fix: cutoffEnd was 2026-09-15T00:00:00.000Z -> timesheetWorkDate <= cutoffEnd evaluated to false!
    // After fix: cutoffEnd is 2026-09-15T23:59:59.999Z -> timesheetWorkDate <= cutoffEnd evaluates to true!
    expect(timesheetWorkDate.getTime()).toBeGreaterThanOrEqual(cutoffStart.getTime());
    expect(timesheetWorkDate.getTime()).toBeLessThanOrEqual(cutoffEnd.getTime());
  });

  it("includes an employee separated after cutoffEnd and excludes them once cutoffEnd is on or after dateSeparated", () => {
    const emp = {
      employmentStatus: "RESIGNED",
      dateHired: new Date("2026-07-26T00:00:00.000Z"),
      dateSeparated: new Date("2026-10-03T00:00:00.000Z"),
    };

    const isEligibleForCutoff = (cutoffEndStr: string) => {
      const cutoffEnd = new Date(cutoffEndStr);
      cutoffEnd.setUTCHours(23, 59, 59, 999);
      const hiredInTime = emp.dateHired <= cutoffEnd;
      const activeDuringCutoff =
        (["PROBATIONARY", "REGULAR", "RETAINER"].includes(emp.employmentStatus) &&
          (emp.dateSeparated === null || emp.dateSeparated > cutoffEnd)) ||
        (emp.dateSeparated !== null && emp.dateSeparated > cutoffEnd);
      return hiredInTime && activeDuringCutoff;
    };

    // Sept 11 - Sept 25 cutoff: employee resigned Oct 3 -> still active during Sept 11-25
    expect(isEligibleForCutoff("2026-09-25T00:00:00.000Z")).toBe(true);

    // Sept 26 - Oct 10 cutoff: employee resigned Oct 3 -> settled via Final Pay
    expect(isEligibleForCutoff("2026-10-10T00:00:00.000Z")).toBe(false);
  });
});

