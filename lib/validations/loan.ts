import { z } from "zod";
import { optionalCoercedNumber } from "./shared";

export const loanCategoryValues = [
  "SSS_LOAN",
  "PAGIBIG_LOAN",
  "COMPANY_LOAN",
  "CASH_ADVANCE",
  "OTHER",
] as const;

export const createLoanSchema = z.object({
  employeeId: z.string().min(1),
  category: z.enum(loanCategoryValues),
  name: z.string().min(1, "Required"),
  principal: z.coerce.number().positive("Must be greater than 0"),
  termMonths: optionalCoercedNumber(z.coerce.number().int().positive()),
  installmentAmount: z.coerce.number().positive("Must be greater than 0"),
  startDate: z.string().min(1, "Required"),
  referenceNumber: z.string().optional(),
});
export type CreateLoanFormValues = z.input<typeof createLoanSchema>;
export type CreateLoanInput = z.output<typeof createLoanSchema>;

export const updateLoanSchema = z.object({
  action: z.literal("cancel"),
});
