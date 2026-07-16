import { Decimal } from "decimal.js";
import type { SssBracketRow } from "../types";

export interface SssContributionResult {
  msc: Decimal;
  eeShare: Decimal;
  erShare: Decimal;
  mpfEeShare: Decimal;
  mpfErShare: Decimal;
  ecAmount: Decimal;
  totalEmployeeContribution: Decimal;
  totalEmployerContribution: Decimal;
}

/**
 * `brackets` must be every SSS bracket row valid as of the target period
 * (the caller resolves effective-dating via Prisma before calling this).
 * Compensation is matched to the bracket whose [mscFloor, mscCeiling] range
 * contains it; the bottom/top rows are expected to have floor=0 and an
 * open-ended ceiling so every non-negative compensation resolves.
 */
export function getSssContribution(
  monthlyCompensation: Decimal.Value,
  brackets: SssBracketRow[]
): SssContributionResult {
  const comp = new Decimal(monthlyCompensation);
  const bracket = brackets.find((b) => comp.gte(b.mscFloor) && comp.lte(b.mscCeiling));

  if (!bracket) {
    throw new Error(
      `No SSS contribution bracket covers compensation ${comp.toString()} — rate table may be incomplete`
    );
  }

  const eeShare = new Decimal(bracket.eeShare);
  const erShare = new Decimal(bracket.erShare);
  const mpfEeShare = new Decimal(bracket.mpfEeShare);
  const mpfErShare = new Decimal(bracket.mpfErShare);
  const ecAmount = new Decimal(bracket.ecAmount);

  return {
    msc: new Decimal(bracket.msc),
    eeShare,
    erShare,
    mpfEeShare,
    mpfErShare,
    ecAmount,
    totalEmployeeContribution: eeShare.plus(mpfEeShare),
    totalEmployerContribution: erShare.plus(mpfErShare).plus(ecAmount),
  };
}
