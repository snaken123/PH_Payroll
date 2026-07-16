import { Decimal } from "decimal.js";

export interface ThirteenthMonthResult {
  thirteenthMonthPay: Decimal;
  taxableExcess: Decimal;
}

/**
 * 13th month pay = total BASIC salary actually earned in the calendar year
 * / 12 (PD 851). Excludes overtime, holiday/rest-day premiums, night
 * differential, and allowances — the caller must pass only the sum of
 * BASIC_PAY line items across the year's posted payslips, not gross pay.
 *
 * `otherNonTaxableBenefitsForYear` (de minimis excess, other bonuses, etc.)
 * shares the same combined ₱90,000 exemption ceiling as 13th month pay —
 * this is a SIMPLIFIED Phase 2 treatment (assumes 13th month is evaluated
 * last against whatever ceiling room remains). The precise ordering/
 * interaction between de minimis-excess and 13th month for the combined
 * ceiling is intricate and deferred to the Phase 4 annualization engine.
 */
export function computeThirteenthMonthPay(
  basicSalaryEarnedForYear: Decimal.Value,
  exemptionCeiling: Decimal.Value,
  otherNonTaxableBenefitsForYear: Decimal.Value = 0
): ThirteenthMonthResult {
  const thirteenthMonthPay = new Decimal(basicSalaryEarnedForYear)
    .dividedBy(12)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  const remainingCeiling = Decimal.max(
    new Decimal(exemptionCeiling).minus(otherNonTaxableBenefitsForYear),
    0
  );
  const taxableExcess = Decimal.max(thirteenthMonthPay.minus(remainingCeiling), 0);

  return { thirteenthMonthPay, taxableExcess };
}
