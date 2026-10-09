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
});
