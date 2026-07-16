import { z } from "zod";

export const createContractorSchema = z.object({
  name: z.string().min(1, "Required"),
  tin: z.string().min(1, "Required"),
  address: z.string().min(1, "Required"),
  atcCode: z.string().min(1, "Required"),
  defaultEwtRate: z.coerce.number().min(0, "Must be 0 or greater").max(1, "Enter as a decimal, e.g. 0.10 for 10%"),
  isVatRegistered: z.boolean().default(false),
});
export type CreateContractorFormValues = z.input<typeof createContractorSchema>;
export type CreateContractorInput = z.output<typeof createContractorSchema>;

// contractorId is intentionally NOT a field here — the API route sources it
// from the URL path param, never the body, and a required field the form
// never populates would silently fail client-side Zod validation with no
// visible error (same bug class fixed in the loan dialog — see
// lib/validations/shared.ts's comment for the general pattern).
export const createContractorPaymentSchema = z.object({
  paymentDate: z.string().min(1, "Required"),
  grossAmount: z.coerce.number().positive("Must be greater than 0"),
  ewtRate: z.coerce.number().min(0).max(1),
  invoiceReference: z.string().optional(),
});
export type CreateContractorPaymentFormValues = z.input<typeof createContractorPaymentSchema>;
export type CreateContractorPaymentInput = z.output<typeof createContractorPaymentSchema>;
