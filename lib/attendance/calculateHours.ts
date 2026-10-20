export interface CompanyAttendanceConfig {
  attendanceStandardTimeIn?: string;         // e.g. "09:30"
  attendanceStandardTimeOut?: string;        // e.g. "18:30"
  attendanceLunchBreakMinutes?: number;      // e.g. 60
  attendanceLateGracePeriodMinutes?: number; // e.g. 15
  attendanceOtGracePeriodMinutes?: number;   // e.g. 15
  attendanceFlexi1WindowStart?: string;      // e.g. "07:00"
  attendanceFlexi1WindowEnd?: string;        // e.g. "10:00"
  attendanceFlexi1LateGracePeriodMinutes?: number; // e.g. 15
  // Saturday Rule parameters
  attendanceSaturdayRuleEnabled?: boolean;
  attendanceSaturdayWindowStart?: string;    // e.g. "07:30"
  attendanceSaturdayWindowEnd?: string;      // e.g. "10:30"
  attendanceSaturdayGracePeriodMinutes?: number; // e.g. 10
  attendanceSaturdayShiftHours?: number;     // e.g. 5
  attendanceSaturdayBreakMinutes?: number;   // e.g. 0
  attendanceSaturdayEmployeeIds?: string[] | null;
  // Special Day Schedule parameters
  specialDaySchedule?: {
    standardTimeIn: string;
    standardTimeOut?: string | null;
    lunchBreakMinutes?: number;
    lateGracePeriodMinutes?: number;
    otGracePeriodMinutes?: number;
  } | null;
}

export interface CalculateHoursInput {
  workDate?: Date | string | null;
  employeeId?: string | null;
  scheduleType?: string | null;
  timeIn?: string | null;
  timeOut?: string | null;
  customBreakMinutes?: number | null;
  config?: CompanyAttendanceConfig;
}

export interface CalculateHoursResult {
  regularHours: number;
  overtimeHours: number;
  lateMinutes: number;
  undertimeMinutes: number;
  breakMinutes: number;
  nightDiffHours: number;
}

function parseMinutes(timeStr?: string | null): number | null {
  if (!timeStr || typeof timeStr !== "string" || !timeStr.includes(":")) return null;
  const [hStr, mStr] = timeStr.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function roundToQuarter(num: number): number {
  return Math.round(num * 100) / 100;
}

export function isSaturdayDate(workDate?: Date | string | null): boolean {
  if (!workDate) return false;
  if (typeof workDate === "string") {
    const match = workDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      return new Date(Date.UTC(year, month, day)).getUTCDay() === 6;
    }
  }
  const d = new Date(workDate);
  return d.getUTCDay() === 6 || d.getDay() === 6;
}

export function isSaturdayRuleActiveForDate(
  workDate: Date | string | null | undefined,
  employeeId: string | null | undefined,
  config?: CompanyAttendanceConfig
): boolean {
  if (!isSaturdayDate(workDate)) return false;
  const satRuleEnabled = config?.attendanceSaturdayRuleEnabled ?? false;
  if (!satRuleEnabled) return false;
  const satEmpIds = config?.attendanceSaturdayEmployeeIds;
  const appliesToThisEmp =
    !satEmpIds || satEmpIds.length === 0 || (employeeId ? satEmpIds.includes(employeeId) : false);
  return appliesToThisEmp;
}

export function calculateNightDiffHours(rawInMins: number | null, rawOutMins: number | null): number {
  if (rawInMins === null || rawOutMins === null) return 0;

  let start = rawInMins;
  let end = rawOutMins;
  if (end < start) {
    // Overnight shift: timeOut is on next calendar day
    end += 1440;
  }

  // Night diff window is 10:00 PM (22:00 = 1320m) to 6:00 AM (06:00 = 360m / 1800m)
  const nightWindows: Array<[number, number]> = [
    [0, 360],         // Day 1 12am - 6am
    [1320, 1440],     // Day 1 10pm - 12am
    [1440, 1800],     // Day 2 12am - 6am
    [2760, 2880],     // Day 2 10pm - 12am
  ];

  let totalNightMinutes = 0;
  for (const [winStart, winEnd] of nightWindows) {
    const overlapStart = Math.max(start, winStart);
    const overlapEnd = Math.min(end, winEnd);
    if (overlapEnd > overlapStart) {
      totalNightMinutes += overlapEnd - overlapStart;
    }
  }

  return roundToQuarter(totalNightMinutes / 60);
}

export function calculateTimesheetHours(input: CalculateHoursInput): CalculateHoursResult {
  const { scheduleType, timeIn, timeOut, customBreakMinutes, config, workDate, employeeId } = input;

  const rawInMins = parseMinutes(timeIn);
  const rawOutMins = parseMinutes(timeOut);
  const nightDiffHours = calculateNightDiffHours(rawInMins, rawOutMins);

  // 1. Check for Saturday Shift Rule
  const isSaturdayRuleActive = isSaturdayRuleActiveForDate(workDate, employeeId, config);

  if (isSaturdayRuleActive) {
    const windowStartStr = config?.attendanceSaturdayWindowStart || "07:30";
    const windowEndStr = config?.attendanceSaturdayWindowEnd || "10:30";
    const satGraceMinutes = config?.attendanceSaturdayGracePeriodMinutes ?? 10;
    const shiftHours = config?.attendanceSaturdayShiftHours ?? 5.0;
    const requiredWorkMins = shiftHours * 60; // 5 hours = 300 minutes
    const satBreakMinutes = customBreakMinutes ?? config?.attendanceSaturdayBreakMinutes ?? 0;

    // Default output if neither time-in nor time-out is specified on Saturday with rule active
    if (rawInMins === null && rawOutMins === null) {
      return {
        regularHours: shiftHours,
        overtimeHours: 0,
        lateMinutes: 0,
        undertimeMinutes: 0,
        breakMinutes: satBreakMinutes,
        nightDiffHours: 0,
      };
    }

    const windowStartMins = parseMinutes(windowStartStr) ?? 450;
    const windowEndMins = parseMinutes(windowEndStr) ?? 630;
    const inMins = rawInMins ?? windowStartMins;

    let effectiveStartMins: number;
    let lateMinutes = 0;

    if (inMins < windowStartMins) {
      effectiveStartMins = windowStartMins;
      lateMinutes = 0;
    } else if (inMins <= windowEndMins + satGraceMinutes) {
      effectiveStartMins = inMins <= windowEndMins ? inMins : windowEndMins;
      lateMinutes = 0;
    } else {
      effectiveStartMins = windowEndMins;
      lateMinutes = inMins - windowEndMins;
    }

    const outMins = rawOutMins ?? (effectiveStartMins + requiredWorkMins + satBreakMinutes);
    const elapsedMins = outMins - effectiveStartMins;
    const workedMins = Math.max(0, elapsedMins - satBreakMinutes);

    let undertimeMinutes = 0;
    if (workedMins < requiredWorkMins) {
      undertimeMinutes = requiredWorkMins - workedMins;
    }

    let overtimeHours = 0;
    if (workedMins > requiredWorkMins) {
      overtimeHours = roundToQuarter((workedMins - requiredWorkMins) / 60);
    }

    const netReductionMinutes = lateMinutes + undertimeMinutes;
    const regularHours = Math.max(0, roundToQuarter(shiftHours - netReductionMinutes / 60));

    return {
      regularHours,
      overtimeHours,
      lateMinutes,
      undertimeMinutes,
      breakMinutes: satBreakMinutes,
      nightDiffHours,
    };
  }

  // 2. Check for Special Day Schedule override
  const specialDay = config?.specialDaySchedule;
  const stdTimeInStr = specialDay?.standardTimeIn || config?.attendanceStandardTimeIn || "09:30";
  const stdTimeOutStr = specialDay?.standardTimeOut || config?.attendanceStandardTimeOut || "18:30";
  const lunchBreakMinutes = customBreakMinutes ?? specialDay?.lunchBreakMinutes ?? config?.attendanceLunchBreakMinutes ?? 60;
  const lateGraceMinutes = specialDay?.lateGracePeriodMinutes ?? config?.attendanceLateGracePeriodMinutes ?? 15;
  const otGraceMinutes = specialDay?.otGracePeriodMinutes ?? config?.attendanceOtGracePeriodMinutes ?? 15;
  const flexiWindowStartStr = config?.attendanceFlexi1WindowStart || "07:00";
  const flexiWindowEndStr = config?.attendanceFlexi1WindowEnd || "10:00";
  const flexiLateGraceMinutes = config?.attendanceFlexi1LateGracePeriodMinutes ?? 15;

  // Default output if neither time-in nor time-out is specified (regular non-Saturday)
  if (rawInMins === null && rawOutMins === null) {
    return {
      regularHours: 8.0,
      overtimeHours: 0,
      lateMinutes: 0,
      undertimeMinutes: 0,
      breakMinutes: lunchBreakMinutes,
      nightDiffHours: 0,
    };
  }

  // Overnight shift detection (time-out is on the next calendar day, e.g. 17:00 to 04:00)
  if (rawInMins !== null && rawOutMins !== null && rawOutMins < rawInMins) {
    const effectiveOutMins = rawOutMins + 1440;
    const totalWorkedMins = Math.max(0, effectiveOutMins - rawInMins - lunchBreakMinutes);
    const workedHours = totalWorkedMins / 60;
    const regularHours = Math.min(8.0, roundToQuarter(workedHours));
    const overtimeHours = Math.max(0, roundToQuarter(workedHours - 8.0));

    return {
      regularHours,
      overtimeHours,
      lateMinutes: 0,
      undertimeMinutes: 0,
      breakMinutes: lunchBreakMinutes,
      nightDiffHours,
    };
  }

  const normalizedSchedule = (scheduleType || "Regular").trim().toUpperCase();

  if (normalizedSchedule === "FLEXI1") {
    const windowStartMins = parseMinutes(flexiWindowStartStr) ?? 420; // 07:00
    const windowEndMins = parseMinutes(flexiWindowEndStr) ?? 600;     // 10:00

    const inMins = rawInMins ?? windowStartMins;

    let effectiveStartMins: number;
    let lateMinutes = 0;

    if (inMins < windowStartMins) {
      effectiveStartMins = windowStartMins;
      lateMinutes = 0;
    } else if (inMins <= windowEndMins + flexiLateGraceMinutes) {
      effectiveStartMins = inMins <= windowEndMins ? inMins : windowEndMins;
      lateMinutes = 0;
    } else {
      effectiveStartMins = windowEndMins;
      lateMinutes = inMins - windowEndMins;
    }

    const outMins = rawOutMins ?? (effectiveStartMins + 540); // default to 9h span
    const elapsedMins = outMins - effectiveStartMins;
    const workedMins = elapsedMins - lunchBreakMinutes;
    const requiredWorkMins = 480; // 8.0 hours

    let undertimeMinutes = 0;
    if (workedMins < requiredWorkMins) {
      undertimeMinutes = requiredWorkMins - Math.max(0, workedMins);
    }

    const netReductionMinutes = lateMinutes + undertimeMinutes;
    const regularHours = Math.max(0, roundToQuarter(8.0 - netReductionMinutes / 60));

    return {
      regularHours,
      overtimeHours: 0, // Flexi1 has NO Overtime
      lateMinutes,
      undertimeMinutes,
      breakMinutes: lunchBreakMinutes,
      nightDiffHours,
    };
  }

  if (normalizedSchedule === "REGULAR") {
    const stdInMins = parseMinutes(stdTimeInStr) ?? 570;   // 09:30
    const stdOutMins = parseMinutes(stdTimeOutStr) ?? 1110; // 18:30

    const inMins = rawInMins ?? stdInMins;
    const outMins = rawOutMins ?? stdOutMins;

    // Late Minutes
    let lateMinutes = 0;
    if (inMins > stdInMins + lateGraceMinutes) {
      lateMinutes = inMins - stdInMins;
    }

    // Undertime Minutes
    let undertimeMinutes = 0;
    if (outMins < stdOutMins) {
      undertimeMinutes = stdOutMins - outMins;
    }

    // Pre-shift Overtime (early arrival before standard time in)
    let preOtMinutes = 0;
    if (inMins < stdInMins - otGraceMinutes) {
      preOtMinutes = stdInMins - inMins;
    }

    // Post-shift Overtime (late departure after standard time out)
    let postOtMinutes = 0;
    if (outMins > stdOutMins + otGraceMinutes) {
      postOtMinutes = outMins - stdOutMins;
    }

    const totalOtMinutes = preOtMinutes + postOtMinutes;
    const overtimeHours = roundToQuarter(totalOtMinutes / 60);

    const netReductionMinutes = lateMinutes + undertimeMinutes;
    const regularHours = Math.max(0, roundToQuarter(8.0 - netReductionMinutes / 60));

    return {
      regularHours,
      overtimeHours,
      lateMinutes,
      undertimeMinutes,
      breakMinutes: lunchBreakMinutes,
      nightDiffHours,
    };
  }

  // Fallback for Field, On-Call, Flexi2 or unspecified custom schedules
  const inMins = rawInMins ?? 480;
  const outMins = rawOutMins ?? (inMins + 540);
  const totalWorkedMins = Math.max(0, outMins - inMins - lunchBreakMinutes);
  const workedHours = totalWorkedMins / 60;
  const regularHours = Math.min(8.0, roundToQuarter(workedHours));
  const overtimeHours = Math.max(0, roundToQuarter(workedHours - 8.0));

  return {
    regularHours,
    overtimeHours,
    lateMinutes: 0,
    undertimeMinutes: 0,
    breakMinutes: lunchBreakMinutes,
    nightDiffHours,
  };
}
