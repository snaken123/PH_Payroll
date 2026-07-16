import { Decimal } from "decimal.js";
import type { PayBasis } from "./types";

const DEFAULT_WORK_DAYS_PER_MONTH = 22;

/**
 * Used for minimum-wage advisory comparisons (see MinimumWageRate) — NOT
 * for actual payroll computation, which uses computeBasePay's own
 * per-payBasis divisor logic. Falls back to the same 22-day assumption as
 * estimateMonthlyEquivalentCompensation when no divisor is configured.
 */
export function estimateDailyRateEquivalent(
  payBasis: PayBasis,
  basicRate: Decimal.Value,
  standardWorkDaysPerMonth?: Decimal.Value
): Decimal {
  const rate = new Decimal(basicRate);
  if (payBasis === "DAILY_RATE") return rate;
  if (payBasis === "HOURLY_RATE") return rate.times(8);
  const workDays = new Decimal(standardWorkDaysPerMonth ?? DEFAULT_WORK_DAYS_PER_MONTH);
  return rate.dividedBy(workDays);
}
