import { z } from "zod";

export const createPayrollRunSchema = z.object({
  cutoffStart: z.string().min(1),
  cutoffEnd: z.string().min(1),
  payDate: z.string().min(1),
  periodType: z.enum(["FIRST_HALF", "SECOND_HALF"]),
});
export type CreatePayrollRunInput = z.infer<typeof createPayrollRunSchema>;
