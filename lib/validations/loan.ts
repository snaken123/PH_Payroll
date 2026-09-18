import { z } from "zod";
import { optionalCoercedNumber } from "./shared";

export const loanCategoryValues = [
  "SSS_LOAN",
  "PAGIBIG_LOAN",
  "COMPANY_LOAN",
  "CASH_ADVANCE",
  "OTHER",
] as const;

export const loanDeductionFrequencyValues = ["EVERY_CUTOFF", "MONTHLY"] as const;

export const createLoanSchema = z.object({
  employeeId: z.string().min(1),
  category: z.enum(loanCategoryValues),
  name: z.string().min(1, "Required"),
  principal: optionalCoercedNumber(z.coerce.number().min(0)).default(0),
  termMonths: optionalCoercedNumber(z.coerce.number().int().positive()),
  installmentAmount: z.coerce.number().positive("Must be greater than 0"),
  deductionFrequency: z.enum(loanDeductionFrequencyValues).default("EVERY_CUTOFF"),
  startDate: z.string().min(1, "Required"),
  endDate: z.string().optional().nullable().or(z.literal("")),
  referenceNumber: z.string().optional(),
  hasNoExpiration: z.boolean().default(false),
}).refine(
  (data) => {
    if (!data.hasNoExpiration && (!data.endDate || data.endDate.trim() === "")) {
      return (data.principal ?? 0) > 0;
    }
    return true;
  },
  {
    message: "Principal amount is required unless an end date or ongoing recurring deduction is specified",
    path: ["principal"],
  }
);
export type CreateLoanFormValues = z.input<typeof createLoanSchema>;
export type CreateLoanInput = z.output<typeof createLoanSchema>;

export const updateLoanSchema = z.object({
  action: z.literal("cancel"),
});

export const rejectLoanSchema = z.object({
  reason: z.string().min(1, "A reason is required"),
});
