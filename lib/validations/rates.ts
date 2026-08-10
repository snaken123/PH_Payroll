import { z } from "zod";
import { DeMinimisCategory, DeMinimisFrequency, PayPeriodType, WageSector } from "@/lib/generated/prisma/enums";

export const sssBracketInputSchema = z.object({
  mscFloor: z.number().min(0),
  mscCeiling: z.number().min(0),
  msc: z.number().min(0),
  eeShare: z.number().min(0),
  erShare: z.number().min(0),
  mpfEeShare: z.number().min(0).optional().nullable(),
  mpfErShare: z.number().min(0).optional().nullable(),
  ecAmount: z.number().min(0),
});

export const updateSssRatesSchema = z.object({
  effectiveFrom: z.string().min(1, "Effective date is required"),
  sourceReference: z.string().min(1, "Source reference is required"),
  brackets: z.array(sssBracketInputSchema).min(1, "At least one bracket is required"),
});

export const updatePhilhealthConfigSchema = z.object({
  effectiveFrom: z.string().min(1, "Effective date is required"),
  premiumRate: z.number().min(0).max(1),
  eeShareRate: z.number().min(0).max(1),
  erShareRate: z.number().min(0).max(1),
  floorSalary: z.number().min(0),
  ceilingSalary: z.number().min(0),
  sourceReference: z.string().min(1, "Source reference is required"),
});

export const updatePagibigBracketSchema = z.object({
  effectiveFrom: z.string().min(1, "Effective date is required"),
  salaryThreshold: z.number().min(0),
  eeRateBelowThreshold: z.number().min(0).max(1),
  erRateBelowThreshold: z.number().min(0).max(1),
  eeRateAboveThreshold: z.number().min(0).max(1),
  erRateAboveThreshold: z.number().min(0).max(1),
  maxFundSalary: z.number().min(0),
  eeCap: z.number().min(0),
  erCap: z.number().min(0),
  sourceReference: z.string().min(1, "Source reference is required"),
});

export const birBracketInputSchema = z.object({
  payPeriodType: z.nativeEnum(PayPeriodType),
  bracketFloor: z.number().min(0),
  bracketCeiling: z.number().min(0).optional().nullable(),
  baseTax: z.number().min(0),
  excessRate: z.number().min(0).max(1),
});

export const updateBirBracketsSchema = z.object({
  effectiveFrom: z.string().min(1, "Effective date is required"),
  sourceReference: z.string().min(1, "Source reference is required"),
  brackets: z.array(birBracketInputSchema).min(1, "At least one bracket is required"),
});

export const updateDeMinimisCeilingSchema = z.object({
  effectiveFrom: z.string().min(1, "Effective date is required"),
  category: z.nativeEnum(DeMinimisCategory),
  ceilingAmount: z.number().min(0),
  frequency: z.nativeEnum(DeMinimisFrequency),
  sourceReference: z.string().min(1, "Source reference is required"),
});

export const updateMinimumWageRateSchema = z.object({
  effectiveFrom: z.string().min(1, "Effective date is required"),
  region: z.string().min(1, "Region is required"),
  sector: z.nativeEnum(WageSector),
  dailyRate: z.number().min(0),
  wageOrderReference: z.string().min(1, "Wage order reference is required"),
});

export const updateThirteenthMonthConfigSchema = z.object({
  effectiveFrom: z.string().min(1, "Effective date is required"),
  exemptionCeiling: z.number().min(0),
  sourceReference: z.string().min(1, "Source reference is required"),
});

export type UpdateSssRatesInput = z.infer<typeof updateSssRatesSchema>;
export type UpdatePhilhealthConfigInput = z.infer<typeof updatePhilhealthConfigSchema>;
export type UpdatePagibigBracketInput = z.infer<typeof updatePagibigBracketSchema>;
export type UpdateBirBracketsInput = z.infer<typeof updateBirBracketsSchema>;
export type UpdateDeMinimisCeilingInput = z.infer<typeof updateDeMinimisCeilingSchema>;
export type UpdateMinimumWageRateInput = z.infer<typeof updateMinimumWageRateSchema>;
export type UpdateThirteenthMonthConfigInput = z.infer<typeof updateThirteenthMonthConfigSchema>;
