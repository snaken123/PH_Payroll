import { z } from "zod";

export const createCompanySchema = z.object({
  companyCode: z
    .string()
    .min(2, "At least 2 characters")
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  legalName: z.string().min(2, "Required"),
  tradeName: z.string().optional(),
  tin: z.string().min(9, "Enter a valid TIN"),
  rdoCode: z.string().min(1, "Required"),
  sssEmployerNumber: z.string().optional(),
  philhealthEmployerNumber: z.string().optional(),
  pagibigEmployerId: z.string().optional(),
  registeredAddress: z.string().min(2, "Required"),
  region: z.string().min(1, "Required"),
  ownerName: z.string().min(2, "Required"),
  ownerEmail: z.string().email("Enter a valid email"),
  ownerPassword: z.string().min(8, "At least 8 characters"),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
