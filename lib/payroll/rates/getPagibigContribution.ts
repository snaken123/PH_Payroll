import { Decimal } from "decimal.js";
import type { PagibigBracketRow } from "../types";

export interface PagibigContributionResult {
  contributionBase: Decimal;
  eeShare: Decimal;
  erShare: Decimal;
  totalContribution: Decimal;
}

/** `bracket` must be the single Pag-IBIG bracket row valid as of the target period. */
export function getPagibigContribution(
  monthlyCompensation: Decimal.Value,
  bracket: PagibigBracketRow
): PagibigContributionResult {
  const comp = new Decimal(monthlyCompensation);
  const base = Decimal.min(comp, bracket.maxFundSalary);
  const isAboveThreshold = comp.gt(bracket.salaryThreshold);

  const eeRate = isAboveThreshold ? bracket.eeRateAboveThreshold : bracket.eeRateBelowThreshold;
  const erRate = isAboveThreshold ? bracket.erRateAboveThreshold : bracket.erRateBelowThreshold;

  const eeShare = Decimal.min(
    base.times(eeRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    bracket.eeCap
  );
  const erShare = Decimal.min(
    base.times(erRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    bracket.erCap
  );

  return {
    contributionBase: base,
    eeShare,
    erShare,
    totalContribution: eeShare.plus(erShare),
  };
}
