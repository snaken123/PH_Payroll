import { describe, it, expect } from "vitest";
import { calculateTimesheetHours, type CompanyAttendanceConfig } from "../../attendance/calculateHours";

describe("calculateTimesheetHours", () => {
  const defaultConfig: CompanyAttendanceConfig = {
    attendanceStandardTimeIn: "08:00",
    attendanceStandardTimeOut: "17:00",
    attendanceLunchBreakMinutes: 60,
    attendanceLateGracePeriodMinutes: 15,
    attendanceOtGracePeriodMinutes: 15,
    attendanceFlexi1WindowStart: "07:00",
    attendanceFlexi1WindowEnd: "10:00",
  };

  describe("Regular Schedule", () => {
    it("should calculate full 8 regular hours and 0 late/undertime/OT for on-time arrival and departure", () => {
      const res = calculateTimesheetHours({
        scheduleType: "Regular",
        timeIn: "08:00",
        timeOut: "17:00",
        config: defaultConfig,
      });

      expect(res).toEqual({
        regularHours: 8.0,
        overtimeHours: 0,
        lateMinutes: 0,
        undertimeMinutes: 0,
        breakMinutes: 60,
      });
    });

    it("should allow up to 15-minute grace period without late deduction", () => {
      const res = calculateTimesheetHours({
        scheduleType: "Regular",
        timeIn: "08:15",
        timeOut: "17:00",
        config: defaultConfig,
      });

      expect(res.lateMinutes).toBe(0);
      expect(res.regularHours).toBe(8.0);
    });

    it("should deduct full late minutes from standard time-in if late exceeds grace period", () => {
      const res = calculateTimesheetHours({
        scheduleType: "Regular",
        timeIn: "08:16",
        timeOut: "17:00",
        config: defaultConfig,
      });

      expect(res.lateMinutes).toBe(16);
      expect(res.regularHours).toBe(7.73); // 8.0 - (16 / 60) = 7.7333... -> 7.73
    });

    it("should calculate undertime if leaving before standard time-out", () => {
      const res = calculateTimesheetHours({
        scheduleType: "Regular",
        timeIn: "08:00",
        timeOut: "16:30",
        config: defaultConfig,
      });

      expect(res.undertimeMinutes).toBe(30);
      expect(res.regularHours).toBe(7.5);
    });

    it("should not calculate OT if departure is within OT grace period (<= 15 mins past 17:00)", () => {
      const res = calculateTimesheetHours({
        scheduleType: "Regular",
        timeIn: "08:00",
        timeOut: "17:15",
        config: defaultConfig,
      });

      expect(res.overtimeHours).toBe(0);
    });

    it("should calculate OT if departure exceeds OT grace period (> 15 mins past 17:00)", () => {
      const res = calculateTimesheetHours({
        scheduleType: "Regular",
        timeIn: "08:00",
        timeOut: "18:30",
        config: defaultConfig,
      });

      expect(res.overtimeHours).toBe(1.5); // 1.5 hours past 17:00
      expect(res.regularHours).toBe(8.0);
    });

    it("should calculate pre-shift OT if arrival is before standard time-in by at least OT grace period", () => {
      const res = calculateTimesheetHours({
        scheduleType: "Regular",
        timeIn: "06:00",
        timeOut: "17:00",
        config: defaultConfig,
      });

      expect(res.overtimeHours).toBe(2.0); // 2.0 hours before 08:00
      expect(res.regularHours).toBe(8.0);
      expect(res.lateMinutes).toBe(0);
    });

    it("should calculate combined pre-shift and post-shift OT for early arrival and late departure", () => {
      const res = calculateTimesheetHours({
        scheduleType: "Regular",
        timeIn: "06:00",
        timeOut: "19:00",
        config: defaultConfig,
      });

      expect(res.overtimeHours).toBe(4.0); // 2.0h pre-shift + 2.0h post-shift
      expect(res.regularHours).toBe(8.0);
      expect(res.lateMinutes).toBe(0);
      expect(res.undertimeMinutes).toBe(0);
    });

    it("should calculate late minutes and reduce regular hours when time-in is 09:46 even if time-out is omitted", () => {
      const res = calculateTimesheetHours({
        scheduleType: "Regular",
        timeIn: "09:46",
        config: defaultConfig,
      });

      expect(res.lateMinutes).toBe(106); // 09:46 - 08:00 = 106 mins
      expect(res.regularHours).toBe(6.23); // 8.0 - (106 / 60) = 6.23 hours
    });
  });

  describe("Flexi1 Schedule", () => {
    it("should start 9-hour timer at window start (07:00) if employee checks in early at 06:30", () => {
      const res = calculateTimesheetHours({
        scheduleType: "Flexi1",
        timeIn: "06:30",
        timeOut: "16:00", // 07:00 + 9 hours span = 16:00
        config: defaultConfig,
      });

      expect(res.lateMinutes).toBe(0);
      expect(res.undertimeMinutes).toBe(0);
      expect(res.regularHours).toBe(8.0);
      expect(res.overtimeHours).toBe(0);
    });

    it("should start 9-hour timer at actual time-in when checking in within window (07:00 - 10:00)", () => {
      const res = calculateTimesheetHours({
        scheduleType: "Flexi1",
        timeIn: "08:30",
        timeOut: "17:30", // 08:30 + 9 hours span = 17:30
        config: defaultConfig,
      });

      expect(res.lateMinutes).toBe(0);
      expect(res.undertimeMinutes).toBe(0);
      expect(res.regularHours).toBe(8.0);
      expect(res.overtimeHours).toBe(0);
    });

    it("should count late minutes from window end (10:00) if checking in after 10:00", () => {
      const res = calculateTimesheetHours({
        scheduleType: "Flexi1",
        timeIn: "10:30",
        timeOut: "19:30",
        config: defaultConfig,
      });

      expect(res.lateMinutes).toBe(30); // 10:30 - 10:00 = 30 mins
      expect(res.undertimeMinutes).toBe(0);
      expect(res.regularHours).toBe(7.5);
      expect(res.overtimeHours).toBe(0);
    });

    it("should compute undertime if total span minus lunch is less than 8 work hours", () => {
      const res = calculateTimesheetHours({
        scheduleType: "Flexi1",
        timeIn: "09:00",
        timeOut: "17:00", // 8 hours total span - 1h lunch = 7h work -> 1h undertime
        config: defaultConfig,
      });

      expect(res.lateMinutes).toBe(0);
      expect(res.undertimeMinutes).toBe(60);
      expect(res.regularHours).toBe(7.0);
      expect(res.overtimeHours).toBe(0);
    });

    it("should never calculate overtime for Flexi1 even when staying late", () => {
      const res = calculateTimesheetHours({
        scheduleType: "Flexi1",
        timeIn: "08:00",
        timeOut: "20:00", // 12 hours span
        config: defaultConfig,
      });

      expect(res.regularHours).toBe(8.0);
      expect(res.overtimeHours).toBe(0);
    });
  });

  describe("Fallback Schedules", () => {
    it("should calculate simple worked hours minus lunch for Field / On-Call schedules", () => {
      const res = calculateTimesheetHours({
        scheduleType: "Field",
        timeIn: "09:00",
        timeOut: "19:00", // 10 hours span - 1h lunch = 9h work -> 8h reg + 1h OT
        config: defaultConfig,
      });

      expect(res.regularHours).toBe(8.0);
      expect(res.overtimeHours).toBe(1.0);
      expect(res.lateMinutes).toBe(0);
      expect(res.undertimeMinutes).toBe(0);
    });
  });
});
