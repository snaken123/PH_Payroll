import { Decimal } from "decimal.js";

export interface RetirementPayResult {
  amount: Decimal;
  isTaxExempt: boolean;
}

const DAYS_PER_YEAR_OF_SERVICE = 22.5; // RA 7641: 15 days + 1/12 of 13th month (2.5 days) + cash value of up to 5 days SIL

/**
 * RA 7641 / Labor Code Art. 302 statutory retirement pay floor. This is the
 * *minimum* the law requires when there's no private plan (or an existing
 * plan pays less) — a more generous CBA/company policy retirement plan
 * controls if better than this. Reconciliation with a separately
 * BIR-registered private plan (RA 4917 / NIRC 32(B)(6)(a), different age/
 * service thresholds) is a distinct legal path NOT implemented here — see
 * plan notes.
 */
export function computeRetirementPay(
  dailyRate: Decimal.Value,
  yearsOfServiceCredited: number
): RetirementPayResult {
  const rate = new Decimal(dailyRate);
  const amount = rate.times(DAYS_PER_YEAR_OF_SERVICE).times(yearsOfServiceCredited);

  return { amount, isTaxExempt: true };
}
