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

export const allowanceSchema = z.object({
  label: z.string().min(1, "Required"),
  amount: z.coerce.number().nonnegative("Must be 0 or greater"),
  isTaxable: z.boolean().default(true),
});
export type AllowanceFormValues = z.input<typeof allowanceSchema>;
export type AllowanceInput = z.output<typeof allowanceSchema>;

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
  allowances: z.array(allowanceSchema).default([]),
});

// z.input is the raw (pre-coercion) shape react-hook-form's state holds;
// z.output is what the resolver produces after zod's coerce/transform runs.
export type CreateEmployeeFormValues = z.input<typeof createEmployeeSchema>;
export type CreateEmployeeInput = z.output<typeof createEmployeeSchema>;

export const employmentStatusValues = [
  "PROBATIONARY",
  "REGULAR",
  "RESIGNED",
  "TERMINATED",
  "AWOL",
  "RETIRED",
] as const;

export const separationCategoryValues = [
  "RESIGNATION",
  "TERMINATION_FOR_CAUSE",
  "AUTHORIZED_CAUSE_REDUNDANCY",
  "AUTHORIZED_CAUSE_RETRENCHMENT",
  "AUTHORIZED_CAUSE_DISEASE",
  "RETIREMENT",
  "DEATH",
  "END_OF_CONTRACT",
] as const;

// PATCH /api/employees/[id] — every field is optional since the route is used
// for several distinct partial updates (clearance toggle, separation, profile
// edits), not a single form submission.
export const compensationRecordSchema = z.object({
  effectiveFrom: z.string().min(1, "Required"),
  payBasis: z.enum(payBasisValues),
  basicRate: z.coerce.number().positive("Must be greater than 0"),
  standardWorkDaysPerMonth: optionalCoercedNumber(z.coerce.number().positive()),
  allowances: z.array(allowanceSchema).default([]),
});
export type CompensationRecordFormValues = z.input<typeof compensationRecordSchema>;
export type CompensationRecordInput = z.output<typeof compensationRecordSchema>;

export const markSeparatedSchema = z.object({
  dateSeparated: z.string().min(1, "Required"),
  separationCategory: z.enum(separationCategoryValues),
  separationReason: z.string().optional(),
});
export type MarkSeparatedFormValues = z.input<typeof markSeparatedSchema>;
export type MarkSeparatedInput = z.output<typeof markSeparatedSchema>;

export const updateEmployeeSchema = z.object({
  employeeNumber: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  middleName: z.string().optional(),
  birthDate: z.string().min(1).optional(),
  sex: z.enum(sexValues).optional(),
  civilStatus: z.enum(civilStatusValues).optional(),
  tin: z.string().optional(),
  sssNumber: z.string().optional(),
  philhealthNumber: z.string().optional(),
  pagibigNumber: z.string().optional(),
  positionTitle: z.string().min(1).optional(),
  departmentName: z.string().optional(),
  employmentStatus: z.enum(employmentStatusValues).optional(),
  isManagerialExempt: z.boolean().optional(),
  managerialExemptReason: z.string().optional(),
  dateSeparated: z.string().optional(),
  separationReason: z.string().optional(),
  separationCategory: z.enum(separationCategoryValues).optional(),
  clearanceCompleted: z.boolean().optional(),
});
export type UpdateEmployeeInput = z.output<typeof updateEmployeeSchema>;

// Subset the edit-profile dialog actually submits — same partial-update
// schema underneath (PATCH /api/employees/[id] is shared by several
// distinct flows), just the fields relevant to fixing profile data.
export const editEmployeeProfileSchema = z.object({
  employeeNumber: z.string().min(1, "Required"),
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  middleName: z.string().optional(),
  birthDate: z.string().min(1, "Required"),
  sex: z.enum(sexValues),
  civilStatus: z.enum(civilStatusValues),
  positionTitle: z.string().min(1, "Required"),
  departmentName: z.string().optional(),
  tin: z.string().optional(),
  sssNumber: z.string().optional(),
  philhealthNumber: z.string().optional(),
  pagibigNumber: z.string().optional(),
});
export type EditEmployeeProfileFormValues = z.input<typeof editEmployeeProfileSchema>;
export type EditEmployeeProfileInput = z.output<typeof editEmployeeProfileSchema>;

// One row of the spreadsheet-style bulk-edit table. Profile fields plus the
// employee's CURRENT pay rate — not the full effective-dated compensation
// history, which still goes through "New rate" per employee since it's a
// point-in-time snapshot, not a value to be blanket-edited.
export const bulkEmployeeRowSchema = z.object({
  employeeId: z.string().min(1),
  employeeNumber: z.string().min(1, "Required"),
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  middleName: z.string().optional(),
  birthDate: z.string().min(1, "Required"),
  sex: z.enum(sexValues),
  civilStatus: z.enum(civilStatusValues),
  positionTitle: z.string().min(1, "Required"),
  departmentName: z.string().optional(),
  employmentStatus: z.enum(employmentStatusValues),
  employeeType: z.enum(employeeTypeValues),
  tin: z.string().optional(),
  sssNumber: z.string().optional(),
  philhealthNumber: z.string().optional(),
  pagibigNumber: z.string().optional(),
  payBasis: z.enum(payBasisValues),
  basicRate: z.coerce.number().positive("Must be greater than 0"),
});
export type BulkEmployeeRow = z.output<typeof bulkEmployeeRowSchema>;

export const bulkUpdateEmployeesSchema = z.object({
  rows: z.array(bulkEmployeeRowSchema).min(1),
});
