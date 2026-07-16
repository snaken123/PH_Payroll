import { z } from "zod";
import { optionalCoercedNumber } from "./shared";

export const employeeTypeValues = [
  "MONTHLY_RANK_AND_FILE",
  "DAILY_HOURLY",
  "MANAGERIAL_SUPERVISORY",
] as const;

export const sexValues = ["MALE", "FEMALE"] as const;

export const civilStatusValues = ["SINGLE", "MARRIED", "WIDOWED", "SEPARATED", "ANNULLED"] as const;

export const payBasisValues = ["MONTHLY_RATE", "DAILY_RATE", "HOURLY_RATE"] as const;

export const createEmployeeSchema = z.object({
  branchId: z.string().min(1, "Select a branch"),
  employeeNumber: z.string().min(1, "Required"),
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  middleName: z.string().optional(),
  birthDate: z.string().min(1, "Required"),
  sex: z.enum(sexValues),
  civilStatus: z.enum(civilStatusValues),
  tin: z.string().optional(),
  sssNumber: z.string().optional(),
  philhealthNumber: z.string().optional(),
  pagibigNumber: z.string().optional(),
  employeeType: z.enum(employeeTypeValues),
  isManagerialExempt: z.boolean().default(false),
  dateHired: z.string().min(1, "Required"),
  departmentName: z.string().optional(),
  positionTitle: z.string().min(1, "Required"),
  payBasis: z.enum(payBasisValues),
  basicRate: z.coerce.number().positive("Must be greater than 0"),
  standardWorkDaysPerMonth: optionalCoercedNumber(z.coerce.number().positive()),
});

// z.input is the raw (pre-coercion) shape react-hook-form's state holds;
// z.output is what the resolver produces after zod's coerce/transform runs.
export type CreateEmployeeFormValues = z.input<typeof createEmployeeSchema>;
export type CreateEmployeeInput = z.output<typeof createEmployeeSchema>;
