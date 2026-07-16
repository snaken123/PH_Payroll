import { Decimal } from "decimal.js";

/** Cash conversion of unused, convertible leave credits (e.g. unused SIL)
 * per DOLE Labor Advisory 06-20. Caller is responsible for only passing
 * days from LeaveType rows where isConvertibleToCash is true. */
export function computeLeaveCashout(unusedDays: Decimal.Value, dailyRate: Decimal.Value): Decimal {
  return new Decimal(unusedDays).times(dailyRate);
}
