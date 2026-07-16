import { Decimal } from "decimal.js";

export type SeparationPayCategory =
  | "AUTHORIZED_CAUSE_REDUNDANCY"
  | "AUTHORIZED_CAUSE_RETRENCHMENT"
  | "AUTHORIZED_CAUSE_DISEASE";

export interface SeparationPayResult {
  amount: Decimal;
  isTaxExempt: boolean;
}

const MULTIPLIER_BY_CATEGORY: Record<SeparationPayCategory, number> = {
  // Labor Code Art. 298: "1 month pay OR 1 month pay per year of service,
  // whichever is higher"
  AUTHORIZED_CAUSE_REDUNDANCY: 1.0,
  // Art. 298: "1 month pay OR 1/2 month pay per year of service, whichever
  // is higher"
  AUTHORIZED_CAUSE_RETRENCHMENT: 0.5,
  // Art. 299: same 1/2-month formula as retrenchment/closure
  AUTHORIZED_CAUSE_DISEASE: 0.5,
};

/**
 * "Whichever is higher" is a FLOOR comparison against a flat 1-month
 * minimum, not a doubled multiplier — matters most for short-tenure
 * employees (e.g. 8 months' service still gets a full 1 month, not a
 * fraction of one). All three authorized-cause categories are tax-exempt
 * under NIRC Sec. 32(B)(6)(b) ("any cause beyond the employee's control").
 */
export function computeSeparationPay(
  monthlyRate: Decimal.Value,
  yearsOfServiceCredited: number,
  category: SeparationPayCategory
): SeparationPayResult {
  const rate = new Decimal(monthlyRate);
  const multiplier = MULTIPLIER_BY_CATEGORY[category];
  const perYearAmount = rate.times(yearsOfServiceCredited).times(multiplier);

  return {
    amount: Decimal.max(rate, perYearAmount),
    isTaxExempt: true,
  };
}
