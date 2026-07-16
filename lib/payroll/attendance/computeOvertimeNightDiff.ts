import { Decimal } from "decimal.js";
import type { TimesheetFact } from "./types";

export interface OvertimeNightDiffResult {
  overtimeHours: Decimal;
  overtimePay: Decimal;
  nightDiffHours: Decimal;
  nightDiffPay: Decimal;
}

const OVERTIME_MULTIPLIER = 0.25; // 125% of hourly rate -> +25% premium on top of base
const NIGHT_DIFF_MULTIPLIER = 0.1; // +10% of hourly rate, 10PM-6AM

/**
 * Managerial/supervisory employees flagged isManagerialExempt are exempt
 * from the Labor Code's hours-of-work provisions (Book III, Title I,
 * Art. 82) which cover both overtime pay and night shift differential — so
 * both premiums are zeroed for them, though their base pay for hours worked
 * is unaffected (handled separately in computeBasePay).
 */
export function computeOvertimeNightDiff(
  timesheets: TimesheetFact[],
  hourlyRateEquivalent: Decimal.Value,
  isManagerialExempt: boolean
): OvertimeNightDiffResult {
  const hourlyRate = new Decimal(hourlyRateEquivalent);

  const overtimeHours = timesheets.reduce((sum, t) => sum.plus(t.overtimeHours), new Decimal(0));
  const nightDiffHours = timesheets.reduce((sum, t) => sum.plus(t.nightDiffHours), new Decimal(0));

  if (isManagerialExempt) {
    return {
      overtimeHours,
      overtimePay: new Decimal(0),
      nightDiffHours,
      nightDiffPay: new Decimal(0),
    };
  }

  return {
    overtimeHours,
    overtimePay: hourlyRate.times(overtimeHours).times(1 + OVERTIME_MULTIPLIER),
    nightDiffHours,
    nightDiffPay: hourlyRate.times(nightDiffHours).times(NIGHT_DIFF_MULTIPLIER),
  };
}
