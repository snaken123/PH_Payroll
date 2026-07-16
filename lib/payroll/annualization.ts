import { Decimal } from "decimal.js";
import { getWithholdingTax } from "./rates/getWithholdingTax";
import type { BirBracketRow } from "./types";

export interface AnnualizationResult {
  annualTaxDue: Decimal;
  cumulativeTaxWithheld: Decimal;
  /** Positive = additional tax due from the employee (collect in the final
   * cutoff of the year); negative = over-withheld, refund due. */
  yearEndAdjustment: Decimal;
}

/**
 * Year-end true-up for BIR Form 2316: compares tax actually withheld
 * cutoff-by-cutoff (via the semi-monthly table) against what would have
 * been due computed directly on the year's total taxable compensation
 * using the annual table. `annualBrackets` must be pre-filtered to
 * payPeriodType ANNUAL.
 *
 * KNOWN SIMPLIFICATION: `totalTaxableCompensationForYear` should exclude
 * non-taxable (de minimis) allowances and should fold in the 13th month/
 * other-benefits ₱90,000 combined exemption ceiling per NIRC Sec.
 * 32(B)(7)(e) — this function does not perform that exclusion itself, the
 * caller is responsible for passing an already-adjusted taxable figure.
 * See lib/reports/queries.ts's getForm2316Data for the current (partial)
 * treatment and its caveats.
 */
export function computeAnnualization(
  totalTaxableCompensationForYear: Decimal.Value,
  cumulativeTaxWithheldForYear: Decimal.Value,
  annualBrackets: BirBracketRow[]
): AnnualizationResult {
  const withholding = getWithholdingTax(totalTaxableCompensationForYear, "ANNUAL", annualBrackets);
  const cumulative = new Decimal(cumulativeTaxWithheldForYear);

  return {
    annualTaxDue: withholding.tax,
    cumulativeTaxWithheld: cumulative,
    yearEndAdjustment: withholding.tax.minus(cumulative),
  };
}
