import { Decimal } from "decimal.js";

export interface ExpandedWithholdingTaxResult {
  ewtAmount: Decimal;
  netAmount: Decimal;
}

/**
 * BIR expanded withholding tax: a flat percentage of the gross payment,
 * withheld against a contractor's ATC-code category. Unlike compensation
 * withholding, there's no bracket table — `ewtRate` is admin-entered per
 * contractor (see Contractor.defaultEwtRate) since the correct rate depends
 * on registration status and income thresholds this system doesn't model.
 */
export function computeExpandedWithholdingTax(
  grossAmount: Decimal.Value,
  ewtRate: Decimal.Value
): ExpandedWithholdingTaxResult {
  const gross = new Decimal(grossAmount);
  const ewtAmount = gross.times(ewtRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  return { ewtAmount, netAmount: gross.minus(ewtAmount) };
}
