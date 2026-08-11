import { z } from "zod";
import { StatutoryDeductionTiming } from "@/lib/generated/prisma/enums";

export const updateCompanySettingsSchema = z.object({
  legalName: z.string().min(1, "Legal Name is required"),
  tradeName: z.string().optional().nullable(),
  tin: z.string().min(1, "TIN is required"),
  rdoCode: z.string().min(1, "RDO Code is required"),
  sssEmployerNumber: z.string().optional().nullable(),
  philhealthEmployerNumber: z.string().optional().nullable(),
  pagibigEmployerId: z.string().optional().nullable(),
  registeredAddress: z.string().min(1, "Registered Address is required"),
  region: z.string().min(1, "Region is required"),
  payScheduleStyle: z.string().default("STANDARD_1_15"),
  cutoff1StartDay: z.number().int().min(1).max(31).default(1),
  cutoff1EndDay: z.number().int().min(1).max(31).default(15),
  cutoff2StartDay: z.number().int().min(1).max(31).default(16),
  cutoff2EndDay: z.number().int().min(0).max(31).default(0),
  payDateOffsetDays: z.number().int().min(0).max(30).default(5),
  standardWorkDaysPerMonth: z.number().min(1).max(31).default(22),
  statutoryDeductionTiming: z.nativeEnum(StatutoryDeductionTiming).default(StatutoryDeductionTiming.SECOND_HALF),
});

export type UpdateCompanySettingsInput = z.infer<typeof updateCompanySettingsSchema>;

export const createCompanySchema = z.object({
  companyCode: z.string().min(2, "Company Code is required"),
  legalName: z.string().min(1, "Legal Name is required"),
  tradeName: z.string().optional().nullable(),
  tin: z.string().min(1, "TIN is required"),
  rdoCode: z.string().min(1, "RDO Code is required"),
  sssEmployerNumber: z.string().optional().nullable(),
  philhealthEmployerNumber: z.string().optional().nullable(),
  pagibigEmployerId: z.string().optional().nullable(),
  registeredAddress: z.string().min(1, "Registered Address is required"),
  region: z.string().min(1, "Region is required"),
  ownerName: z.string().min(1, "Owner Name is required"),
  ownerEmail: z.string().email("Valid Owner Email is required"),
  ownerPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
