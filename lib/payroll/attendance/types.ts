import type { Decimal } from "decimal.js";
import type { HolidayType } from "../types";

export type TimesheetStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "LEAVE" | "HOLIDAY" | "REST_DAY";

/**
 * One day's hours-level facts, mirroring the TimesheetEntry Prisma model.
 * regularHours/overtimeHours/nightDiffHours are the source of truth for pay
 * computation — `status` mainly drives monthly-rate absence proration.
 */
export interface TimesheetFact {
  workDate: string;
  status: TimesheetStatus;
  regularHours: Decimal.Value;
  overtimeHours: Decimal.Value;
  nightDiffHours: Decimal.Value;
  lateMinutes: number;
  undertimeMinutes: number;
  holidayType: HolidayType | null;
  isRestDay: boolean;
}
