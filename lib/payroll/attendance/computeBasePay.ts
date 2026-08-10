import { Decimal } from "decimal.js";
import type { PayBasis } from "../types";
import type { TimesheetFact } from "./types";

export interface BasePayInput {
  payBasis: PayBasis;
  /** Monthly salary, daily rate, or hourly rate, depending on payBasis. */
  basicRate: Decimal.Value;
  /** Required for MONTHLY_RATE proration — divisor to derive a daily rate. */
  standardWorkDaysPerMonth?: Decimal.Value;
  timesheets: TimesheetFact[];
  /** Whether this cutoff is semi-monthly (15-day / twice per month). Defaults to false if unsupplied. */
  isSemiMonthly?: boolean;
}

export interface BasePayResult {
  dailyRateEquivalent: Decimal;
  hourlyRateEquivalent: Decimal;
  /** Full pay for the period BEFORE absence/late deductions — this is what
   * the engine should show as the BASIC_PAY earning line item, since
   * absenceDeduction/lateUndertimeDeduction are surfaced as their own
   * separate deduction line items (subtracting both would double-count). */
  grossBasicPay: Decimal;
  /** Net of absence/late deductions — returned for direct callers/tests
   * that want the final take-home base pay in one number. */
  basePay: Decimal;
  absenceDeduction: Decimal;
  lateUndertimeDeduction: Decimal;
}

/**
 * LEAVE-status days are always paid for monthly-rate employees (already
 * covered by the fixed salary — LEAVE is simply excluded from the absence
 * filter). For daily/hourly employees, pay for a LEAVE day is driven
 * entirely by whatever `regularHours` was set on that TimesheetEntry: the
 * Phase 3 leave-approval flow (see app/api/leave/requests/[id]/approve)
 * sets regularHours=8 for a paid LeaveType and 0 for an unpaid one when it
 * upserts the day's entry, so "is this leave paid" is resolved once at
 * approval time rather than re-derived here.
 */
export function computeBasePay(input: BasePayInput): BasePayResult {
  const rate = new Decimal(input.basicRate);

  if (input.payBasis === "HOURLY_RATE") {
    const hourlyRateEquivalent = rate;
    const hoursWorked = input.timesheets.reduce(
      (sum, t) => sum.plus(t.regularHours),
      new Decimal(0)
    );
    const hourlyBasePay = hourlyRateEquivalent.times(hoursWorked);
    return {
      dailyRateEquivalent: hourlyRateEquivalent.times(8),
      hourlyRateEquivalent,
      grossBasicPay: hourlyBasePay,
      basePay: hourlyBasePay,
      absenceDeduction: new Decimal(0),
      lateUndertimeDeduction: new Decimal(0),
    };
  }

  if (input.payBasis === "DAILY_RATE") {
    const dailyRateEquivalent = rate;
    const hourlyRateEquivalent = dailyRateEquivalent.dividedBy(8);

    const basePay = input.timesheets.reduce((sum, t) => {
      const isUnworkedRegularHoliday =
        t.status === "HOLIDAY" && t.holidayType === "REGULAR_HOLIDAY" && new Decimal(t.regularHours).isZero();
      if (isUnworkedRegularHoliday) return sum.plus(dailyRateEquivalent);

      const hours = new Decimal(t.regularHours);
      return sum.plus(hourlyRateEquivalent.times(hours));
    }, new Decimal(0));

    return {
      dailyRateEquivalent,
      hourlyRateEquivalent,
      grossBasicPay: basePay,
      basePay,
      absenceDeduction: new Decimal(0),
      lateUndertimeDeduction: new Decimal(0),
    };
  }

  // MONTHLY_RATE
  if (!input.standardWorkDaysPerMonth) {
    throw new Error("standardWorkDaysPerMonth is required to prorate a monthly-rate employee");
  }
  const dailyRateEquivalent = rate.dividedBy(input.standardWorkDaysPerMonth);
  const hourlyRateEquivalent = dailyRateEquivalent.dividedBy(8);

  const absentDays = input.timesheets.filter((t) => t.status === "ABSENT").length;
  const halfDays = input.timesheets.filter((t) => t.status === "HALF_DAY").length;
  const absenceDeduction = dailyRateEquivalent.times(absentDays + halfDays * 0.5);

  const lateUndertimeMinutes = input.timesheets.reduce(
    (sum, t) => sum + t.lateMinutes + t.undertimeMinutes,
    0
  );
  const lateUndertimeDeduction = hourlyRateEquivalent.times(lateUndertimeMinutes).dividedBy(60);

  const grossBasicPay = input.isSemiMonthly ? rate.dividedBy(2) : rate;
  const basePay = grossBasicPay.minus(absenceDeduction).minus(lateUndertimeDeduction);

  return {
    dailyRateEquivalent,
    hourlyRateEquivalent,
    grossBasicPay,
    basePay,
    absenceDeduction,
    lateUndertimeDeduction,
  };
}
