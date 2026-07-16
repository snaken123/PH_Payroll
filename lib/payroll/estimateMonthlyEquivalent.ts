import { Decimal } from "decimal.js";
import type { PayBasis } from "./types";

const DEFAULT_WORK_DAYS_PER_MONTH = 22;

/**
 * SSS/PhilHealth/Pag-IBIG contribution bases are inherently monthly
 * concepts, so daily/hourly-rate employees need a monthly-equivalent
 * compensation estimate. Uses the employee's configured
 * standardWorkDaysPerMonth divisor where available; falls back to a
 * generic 22-working-day assumption otherwise (documented approximation —
 * exact monthly-equivalent conventions vary by company).
 */
export function estimateMonthlyEquivalentCompensation(
  payBasis: PayBasis,
  basicRate: Decimal.Value,
  standardWorkDaysPerMonth?: Decimal.Value
): Decimal {
  const rate = new Decimal(basicRate);
  const workDays = new Decimal(standardWorkDaysPerMonth ?? DEFAULT_WORK_DAYS_PER_MONTH);

  if (payBasis === "MONTHLY_RATE") return rate;
  if (payBasis === "DAILY_RATE") return rate.times(workDays);
  return rate.times(8).times(workDays); // HOURLY_RATE
}
