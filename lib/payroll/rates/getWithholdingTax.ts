import { Decimal } from "decimal.js";
import type { BirBracketRow, PayPeriodType } from "../types";

export interface WithholdingTaxResult {
  tax: Decimal;
  bracketExcessOver: Decimal;
  excessRate: Decimal;
}

/**
 * `brackets` must be every BIR withholding bracket row valid as of the
 * target period, for every pay period type (this filters to `payPeriodType`
 * itself). Per BIR's published formula, `bracketFloor` doubles as the
 * "excess over" threshold for its own bracket: tax = baseTax + (income -
 * bracketFloor) * excessRate. Verified against BIR's own published example
 * (₱25,000/month -> ₱625.05 withheld under the TRAIN monthly table).
 */
export function getWithholdingTax(
  taxableIncome: Decimal.Value,
  payPeriodType: PayPeriodType,
  brackets: BirBracketRow[]
): WithholdingTaxResult {
  const income = new Decimal(taxableIncome);
  const applicable = brackets
    .filter((b) => b.payPeriodType === payPeriodType)
    .sort((a, b) => new Decimal(a.bracketFloor).comparedTo(b.bracketFloor));

  const bracket = applicable.find(
    (b) => income.gte(b.bracketFloor) && (b.bracketCeiling === null || income.lte(b.bracketCeiling))
  );

  if (!bracket) {
    throw new Error(
      `No BIR withholding bracket found for ${payPeriodType} taxable income ${income.toString()} — rate table may be incomplete`
    );
  }

  const excessOver = new Decimal(bracket.bracketFloor);
  const excess = Decimal.max(income.minus(excessOver), 0);
  const tax = new Decimal(bracket.baseTax)
    .plus(excess.times(bracket.excessRate))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return { tax, bracketExcessOver: excessOver, excessRate: new Decimal(bracket.excessRate) };
}
