import { z } from "zod";

export const createPayrollRunSchema = z.object({
  cutoffStart: z.string().min(1),
  cutoffEnd: z.string().min(1),
  payDate: z.string().min(1),
  periodType: z.enum(["FIRST_HALF", "SECOND_HALF"]),
  approvedOtEmployeeIds: z.array(z.string()).optional(),
  approvedOtHoursMap: z.record(z.string(), z.number()).optional(),
  ignoredUndertimeEmployeeIds: z.array(z.string()).optional(),
  excludeSaturdayTardiness: z.boolean().optional(),
  excludeSaturdayUndertime: z.boolean().optional(),
});

export type CreatePayrollRunInput = z.infer<typeof createPayrollRunSchema>;
