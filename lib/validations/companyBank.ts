import { z } from "zod";

export const createCompanyBankAccountSchema = z.object({
  bankName: z.string().min(1, "Bank Name is required"),
  accountNumber: z.string().min(1, "Account Number is required"),
  accountName: z.string().min(1, "Account Name is required"),
  branchName: z.string().optional().nullable(),
  swiftCode: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
});

export type CreateCompanyBankAccountInput = z.infer<typeof createCompanyBankAccountSchema>;

export const updateCompanyBankAccountSchema = createCompanyBankAccountSchema.partial();
export type UpdateCompanyBankAccountInput = z.infer<typeof updateCompanyBankAccountSchema>;
