export interface CompanyAttendanceConfig {
  attendanceStandardTimeIn?: string;         // e.g. "08:00"
  attendanceStandardTimeOut?: string;        // e.g. "17:00"
  attendanceLunchBreakMinutes?: number;      // e.g. 60
  attendanceLateGracePeriodMinutes?: number; // e.g. 15
  attendanceOtGracePeriodMinutes?: number;   // e.g. 15
  attendanceFlexi1WindowStart?: string;      // e.g. "07:00"
  attendanceFlexi1WindowEnd?: string;        // e.g. "10:00"
}

export interface CalculateHoursInput {
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

export function calculateTimesheetHours(input: CalculateHoursInput): CalculateHoursResult {
  const { scheduleType, timeIn, timeOut, customBreakMinutes, config } = input;

  const stdTimeInStr = config?.attendanceStandardTimeIn || "08:00";
  const stdTimeOutStr = config?.attendanceStandardTimeOut || "17:00";
  const lunchBreakMinutes = customBreakMinutes ?? config?.attendanceLunchBreakMinutes ?? 60;
  const lateGraceMinutes = config?.attendanceLateGracePeriodMinutes ?? 15;
  const otGraceMinutes = config?.attendanceOtGracePeriodMinutes ?? 15;
  const flexiWindowStartStr = config?.attendanceFlexi1WindowStart || "07:00";
  const flexiWindowEndStr = config?.attendanceFlexi1WindowEnd || "10:00";

  const rawInMins = parseMinutes(timeIn);
  const rawOutMins = parseMinutes(timeOut);

  // Default output if neither time-in nor time-out is specified
  if (rawInMins === null && rawOutMins === null) {
    return {
      regularHours: 8.0,
      overtimeHours: 0,
      lateMinutes: 0,
      undertimeMinutes: 0,
      breakMinutes: lunchBreakMinutes,
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
    } else if (inMins <= windowEndMins) {
      effectiveStartMins = inMins;
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
    };
  }

  if (normalizedSchedule === "REGULAR") {
    const stdInMins = parseMinutes(stdTimeInStr) ?? 480;   // 08:00
    const stdOutMins = parseMinutes(stdTimeOutStr) ?? 1020; // 17:00

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

    // Overtime Hours
    let overtimeHours = 0;
    if (outMins > stdOutMins + otGraceMinutes) {
      const otMinutes = outMins - stdOutMins;
      overtimeHours = roundToQuarter(otMinutes / 60);
    }

    const netReductionMinutes = lateMinutes + undertimeMinutes;
    const regularHours = Math.max(0, roundToQuarter(8.0 - netReductionMinutes / 60));

    return {
      regularHours,
      overtimeHours,
      lateMinutes,
      undertimeMinutes,
      breakMinutes: lunchBreakMinutes,
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
  };
}
