import { Decimal } from "decimal.js";
import type { PhilhealthConfigRow } from "../types";

export interface PhilhealthContributionResult {
  contributionBase: Decimal;
  eeShare: Decimal;
  erShare: Decimal;
  totalContribution: Decimal;
}

/** `config` must be the single PhilHealth config row valid as of the target period. */
export function getPhilhealthContribution(
  monthlyCompensation: Decimal.Value,
  config: PhilhealthConfigRow
): PhilhealthContributionResult {
  const comp = new Decimal(monthlyCompensation);
  const floor = new Decimal(config.floorSalary);
  const ceiling = new Decimal(config.ceilingSalary);
  const base = Decimal.max(floor, Decimal.min(comp, ceiling));

  const eeShare = base.times(config.eeShareRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const erShare = base.times(config.erShareRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return {
    contributionBase: base,
    eeShare,
    erShare,
    totalContribution: eeShare.plus(erShare),
  };
}
