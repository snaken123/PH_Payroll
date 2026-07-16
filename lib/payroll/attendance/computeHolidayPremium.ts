import { Decimal } from "decimal.js";
import type { TimesheetFact } from "./types";

export interface HolidayPremiumResult {
  regularHolidayWorkedPremium: Decimal;
  specialNonWorkingWorkedPremium: Decimal;
  restDayWorkedPremium: Decimal;
  totalPremium: Decimal;
}

/**
 * Computes ONLY the incremental premium on top of the 100% base pay a
 * worked day already earns via computeBasePay — e.g. a worked regular
 * holiday totals 200% of the daily rate, but computeBasePay already paid
 * the first 100% (as a normal worked day), so this function adds the
 * remaining 100%. Unworked regular-holiday pay is handled entirely inside
 * computeBasePay (for daily-rate employees) or is already covered by the
 * fixed salary (for monthly-rate employees) — nothing to add here for an
 * unworked holiday.
 *
 * Multipliers (Labor Code, stacked multiplicatively):
 *   regular holiday, worked            -> 200% total (+100% premium)
 *   regular holiday, worked + rest day -> 260% total (+160% premium)
 *   special non-working, worked        -> 130% total (+30% premium)
 *   special non-working, worked + rest -> 150% total (+50% premium)
 *   rest day, worked (non-holiday)     -> 130% total (+30% premium)
 *
 * The premium portion (everything beyond the base 100%) is treated as
 * premium/OT-adjacent pay and is gated by isManagerialExempt, consistent
 * with computeOvertimeNightDiff — managerial employees remain entitled to
 * their base unworked-holiday pay, just not this incremental premium.
 */
export function computeHolidayPremium(
  timesheets: TimesheetFact[],
  dailyRateEquivalent: Decimal.Value,
  isManagerialExempt: boolean
): HolidayPremiumResult {
  const dailyRate = new Decimal(dailyRateEquivalent);
  const zero = new Decimal(0);

  if (isManagerialExempt) {
    return {
      regularHolidayWorkedPremium: zero,
      specialNonWorkingWorkedPremium: zero,
      restDayWorkedPremium: zero,
      totalPremium: zero,
    };
  }

  let regularHolidayWorkedPremium = zero;
  let specialNonWorkingWorkedPremium = zero;
  let restDayWorkedPremium = zero;

  for (const t of timesheets) {
    const worked = new Decimal(t.regularHours).greaterThan(0);
    if (!worked) continue;

    if (t.holidayType === "REGULAR_HOLIDAY") {
      const premiumRate = t.isRestDay ? 1.6 : 1.0;
      regularHolidayWorkedPremium = regularHolidayWorkedPremium.plus(dailyRate.times(premiumRate));
    } else if (t.holidayType === "SPECIAL_NON_WORKING") {
      const premiumRate = t.isRestDay ? 0.5 : 0.3;
      specialNonWorkingWorkedPremium = specialNonWorkingWorkedPremium.plus(dailyRate.times(premiumRate));
    } else if (t.isRestDay) {
      restDayWorkedPremium = restDayWorkedPremium.plus(dailyRate.times(0.3));
    }
  }

  return {
    regularHolidayWorkedPremium,
    specialNonWorkingWorkedPremium,
    restDayWorkedPremium,
    totalPremium: regularHolidayWorkedPremium.plus(specialNonWorkingWorkedPremium).plus(restDayWorkedPremium),
  };
}
