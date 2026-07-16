import type { Decimal } from "decimal.js";

export type PayPeriodType = "DAILY" | "WEEKLY" | "SEMI_MONTHLY" | "MONTHLY" | "ANNUAL";
export type PayBasis = "MONTHLY_RATE" | "DAILY_RATE" | "HOURLY_RATE";
export type EmployeeType = "MONTHLY_RANK_AND_FILE" | "DAILY_HOURLY" | "MANAGERIAL_SUPERVISORY";
export type HolidayType = "REGULAR_HOLIDAY" | "SPECIAL_NON_WORKING";

/** Rate/config row shapes mirror the Prisma statutory tables but are plain
 * data — lib/payroll never imports Prisma, so every function here is a pure,
 * database-free unit that can be golden-value tested directly. */

export interface SssBracketRow {
  mscFloor: Decimal.Value;
  mscCeiling: Decimal.Value;
  msc: Decimal.Value;
  eeShare: Decimal.Value;
  erShare: Decimal.Value;
  mpfEeShare: Decimal.Value;
  mpfErShare: Decimal.Value;
  ecAmount: Decimal.Value;
}

export interface PhilhealthConfigRow {
  premiumRate: Decimal.Value;
  eeShareRate: Decimal.Value;
  erShareRate: Decimal.Value;
  floorSalary: Decimal.Value;
  ceilingSalary: Decimal.Value;
}

export interface PagibigBracketRow {
  salaryThreshold: Decimal.Value;
  eeRateBelowThreshold: Decimal.Value;
  erRateBelowThreshold: Decimal.Value;
  eeRateAboveThreshold: Decimal.Value;
  erRateAboveThreshold: Decimal.Value;
  maxFundSalary: Decimal.Value;
  eeCap: Decimal.Value;
  erCap: Decimal.Value;
}

export interface BirBracketRow {
  payPeriodType: PayPeriodType;
  bracketFloor: Decimal.Value;
  bracketCeiling: Decimal.Value | null;
  baseTax: Decimal.Value;
  excessRate: Decimal.Value;
}
