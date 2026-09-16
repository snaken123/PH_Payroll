import { Decimal } from "decimal.js";
import type { PayBasis } from "./types";

const DEFAULT_WORK_DAYS_PER_MONTH = 26;

export interface AllowanceForStatutoryInput {
  amount: Decimal.Value;
  frequency?: "DAILY" | "MONTHLY" | null;
  isTaxable?: boolean;
  payingCompanyId?: string | null;
}

export interface EstimateMonthlyEquivalentOptions {
  payBasis: PayBasis;
  basicRate: Decimal.Value;
  standardWorkDaysPerMonth?: Decimal.Value;
  allowances?: AllowanceForStatutoryInput[];
  currentCompanyId?: string | null;
  includeOtherCompanyAllowancesInContributions?: boolean;
}

/**
 * SSS/PhilHealth/Pag-IBIG contribution bases are inherently monthly
 * concepts, so daily/hourly-rate employees need a monthly-equivalent
 * compensation estimate. Uses the employee's configured
 * standardWorkDaysPerMonth divisor where available.
 *
 * Excludes allowances paid by a different company (payingCompanyId !== currentCompanyId)
 * when includeOtherCompanyAllowancesInContributions is false (default).
 */
export function estimateMonthlyEquivalentCompensation(
  payBasisOrOptions: PayBasis | EstimateMonthlyEquivalentOptions,
  basicRateArg?: Decimal.Value,
  standardWorkDaysPerMonthArg?: Decimal.Value
): Decimal {
  let payBasis: PayBasis;
  let basicRate: Decimal.Value;
  let standardWorkDaysPerMonth: Decimal.Value | undefined;
  let allowances: AllowanceForStatutoryInput[] = [];
  let currentCompanyId: string | null = null;
  let includeOtherCompanyAllowances = false;

  if (typeof payBasisOrOptions === "object" && payBasisOrOptions !== null) {
    payBasis = payBasisOrOptions.payBasis;
    basicRate = payBasisOrOptions.basicRate;
    standardWorkDaysPerMonth = payBasisOrOptions.standardWorkDaysPerMonth;
    allowances = payBasisOrOptions.allowances ?? [];
    currentCompanyId = payBasisOrOptions.currentCompanyId ?? null;
    includeOtherCompanyAllowances = payBasisOrOptions.includeOtherCompanyAllowancesInContributions ?? false;
  } else {
    payBasis = payBasisOrOptions;
    basicRate = basicRateArg!;
    standardWorkDaysPerMonth = standardWorkDaysPerMonthArg;
  }

  const rate = new Decimal(basicRate);
  const workDays = new Decimal(standardWorkDaysPerMonth ?? DEFAULT_WORK_DAYS_PER_MONTH);

  let baseMonthly: Decimal;
  if (payBasis === "MONTHLY_RATE") {
    baseMonthly = rate;
  } else if (payBasis === "DAILY_RATE") {
    baseMonthly = rate.times(workDays);
  } else {
    baseMonthly = rate.times(8).times(workDays); // HOURLY_RATE
  }

  let totalAllowancesMonthly = new Decimal(0);

  for (const allowance of allowances) {
    const isOtherCompany = !!(
      allowance.payingCompanyId &&
      currentCompanyId &&
      allowance.payingCompanyId !== currentCompanyId
    );

    // Exclude allowances paid by another company when includeOtherCompanyAllowancesInContributions is false
    if (isOtherCompany && !includeOtherCompanyAllowances) {
      continue;
    }

    const amt = new Decimal(allowance.amount ?? 0);
    if (allowance.frequency === "DAILY") {
      totalAllowancesMonthly = totalAllowancesMonthly.plus(amt.times(workDays));
    } else {
      totalAllowancesMonthly = totalAllowancesMonthly.plus(amt);
    }
  }

  return baseMonthly.plus(totalAllowancesMonthly);
}
