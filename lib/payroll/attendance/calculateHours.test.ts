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
    attendanceFlexi1LateGracePeriodMinutes: 15,
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

    it("should allow up to Flexi1 grace period without late deduction (e.g. 10:15 check-in for 10:00 window end)", () => {
      const res = calculateTimesheetHours({
        scheduleType: "Flexi1",
        timeIn: "10:15",
        timeOut: "19:00",
        config: defaultConfig,
      });

      expect(res.lateMinutes).toBe(0);
      expect(res.undertimeMinutes).toBe(0);
      expect(res.regularHours).toBe(8.0);
      expect(res.overtimeHours).toBe(0);
    });

    it("should deduct full late minutes from window end (10:00) if checking in after window end + grace period (e.g. 10:30)", () => {
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

  describe("Saturday Shift Rules", () => {
    const saturdayConfig: CompanyAttendanceConfig = {
      ...defaultConfig,
      attendanceSaturdayRuleEnabled: true,
      attendanceSaturdayWindowStart: "07:30",
      attendanceSaturdayWindowEnd: "10:30",
      attendanceSaturdayGracePeriodMinutes: 10,
      attendanceSaturdayShiftHours: 5.0,
      attendanceSaturdayBreakMinutes: 0,
    };

    // 2026-09-26 is a Saturday
    const saturdayDate = new Date("2026-09-26T00:00:00.000Z");

    it("should allow login between 7:30am and 10:30am with 0 late and full 5-hour shift completion", () => {
      // Arrives 8:00am, completes 5h shift at 13:00pm
      const res = calculateTimesheetHours({
        workDate: saturdayDate,
        scheduleType: "Regular",
        timeIn: "08:00",
        timeOut: "13:00",
        config: saturdayConfig,
      });

      expect(res.lateMinutes).toBe(0);
      expect(res.undertimeMinutes).toBe(0);
      expect(res.regularHours).toBe(8.0);
      expect(res.overtimeHours).toBe(0);
    });

    it("should allow up to 10-minute grace period (e.g. 10:35am arrival) with 0 late", () => {
      // User specification: "(i.e. if they arrive 10:35am, no late)"
      const res = calculateTimesheetHours({
        workDate: saturdayDate,
        timeIn: "10:35",
        timeOut: "15:35", // 5 hours worked
        config: saturdayConfig,
      });

      expect(res.lateMinutes).toBe(0);
      expect(res.undertimeMinutes).toBe(0);
      expect(res.regularHours).toBe(8.0);
    });

    it("should deduct late from 10:30am if arrival exceeds 10-minute grace period (e.g. 10:41am arrival is 11 mins late)", () => {
      // User specification: "(but if they arrive 10:41am, 11 minutes late)"
      const res = calculateTimesheetHours({
        workDate: saturdayDate,
        timeIn: "10:41",
        timeOut: "15:41", // 5 hours worked
        config: saturdayConfig,
      });

      expect(res.lateMinutes).toBe(11); // 10:41 - 10:30 = 11 mins
      expect(res.undertimeMinutes).toBe(0);
      expect(res.regularHours).toBe(7.82); // 8.0 - 11/60 = 7.8166... -> 7.82
    });

    it("should deduct undertime if shift worked is less than 5 hours", () => {
      // User specification: "The shift is only 5 hours. They will be deducted if their shift is less than 5 hours."
      // Arrives on time at 09:00am, but leaves at 13:00pm (4 hours worked -> 1 hour / 60 mins undertime)
      const res = calculateTimesheetHours({
        workDate: saturdayDate,
        timeIn: "09:00",
        timeOut: "13:00",
        config: saturdayConfig,
      });

      expect(res.lateMinutes).toBe(0);
      expect(res.undertimeMinutes).toBe(60);
      expect(res.regularHours).toBe(7.0); // 8.0 - 60/60 = 7.0
    });

    it("should respect employee filtering when specified in attendanceSaturdayEmployeeIds", () => {
      const filteredConfig: CompanyAttendanceConfig = {
        ...saturdayConfig,
        attendanceSaturdayEmployeeIds: ["emp-saturday-only"],
      };

      // Non-selected employee follows regular schedule rules
      const nonSelectedRes = calculateTimesheetHours({
        workDate: saturdayDate,
        employeeId: "emp-regular-schedule",
        scheduleType: "Regular",
        timeIn: "08:16", // Regular standard is 08:00 with 15m grace -> 16 mins late
        timeOut: "17:00",
        config: filteredConfig,
      });
      expect(nonSelectedRes.lateMinutes).toBe(16);

      // Selected employee follows Saturday 7:30-10:30 rule
      const selectedRes = calculateTimesheetHours({
        workDate: saturdayDate,
        employeeId: "emp-saturday-only",
        scheduleType: "Regular",
        timeIn: "08:16", // Within 7:30-10:30 window -> 0 late!
        timeOut: "13:16",
        config: filteredConfig,
      });
      expect(selectedRes.lateMinutes).toBe(0);
      expect(selectedRes.regularHours).toBe(8.0);
    });
  });

  describe("Special Day Schedule Overrides", () => {
    it("should override standard time-in for specific special occasions without changing shift defaults", () => {
      const specialConfig: CompanyAttendanceConfig = {
        ...defaultConfig,
        specialDaySchedule: {
          standardTimeIn: "10:00", // Special day start
          standardTimeOut: "19:00",
          lateGracePeriodMinutes: 20,
          lunchBreakMinutes: 60,
        },
      };

      // Employee arriving at 09:50am is on time
      const res = calculateTimesheetHours({
        scheduleType: "Regular",
        timeIn: "09:50",
        timeOut: "19:00",
        config: specialConfig,
      });

      expect(res.lateMinutes).toBe(0);
      expect(res.regularHours).toBe(8.0);

      // Employee arriving at 10:25am exceeds 20 min grace period -> 25 mins late from 10:00am
      const resLate = calculateTimesheetHours({
        scheduleType: "Regular",
        timeIn: "10:25",
        timeOut: "19:00",
        config: specialConfig,
      });

      expect(resLate.lateMinutes).toBe(25);
    });
  });
});

