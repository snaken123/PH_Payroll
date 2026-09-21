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

export const statutoryDeductionModeValues = ["TABLE", "MANUAL"] as const;

export const paymentMethodValues = ["BANK_TRANSFER", "CASH", "CHECK"] as const;

export const rankValues = [
  "FD",
  "AM1",
  "AM2",
  "AS1",
  "AS2",
  "CL4",
  "PROB",
  "Retainer",
  "S1",
  "S2",
  "VS",
] as const;

export const scheduleTypeValues = [
  "Flexi1",
  "Flexi2",
  "On-Call",
  "Field",
  "Regular",
] as const;

export const allowanceFrequencyValues = ["MONTHLY", "DAILY"] as const;

export const allowanceSchema = z.object({
  label: z.string().min(1, "Required"),
  amount: z.coerce.number().nonnegative("Must be 0 or greater"),
  frequency: z.enum(["MONTHLY", "DAILY"]).default("MONTHLY"),
  isTaxable: z.boolean().default(true),
  payingCompanyId: z.string().optional().nullable(),
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
  personalEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  mobileNumber: z.string().optional(),
  currentAddress: z.string().optional(),
  permanentAddress: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  emergencyContactNumber: z.string().optional(),
  emergencyContactAddress: z.string().optional(),
  tin: z.string().optional(),
  sssNumber: z.string().optional(),
  philhealthNumber: z.string().optional(),
  pagibigNumber: z.string().optional(),
  isDeductSss: z.boolean().default(true),
  sssDeductionMode: z.enum(statutoryDeductionModeValues).default("TABLE"),
  sssCustomAmountEe: optionalCoercedNumber(z.coerce.number().min(0)),
  sssCustomAmountEr: optionalCoercedNumber(z.coerce.number().min(0)),
  isDeductPhilhealth: z.boolean().default(true),
  philhealthDeductionMode: z.enum(statutoryDeductionModeValues).default("TABLE"),
  philhealthCustomAmountEe: optionalCoercedNumber(z.coerce.number().min(0)),
  philhealthCustomAmountEr: optionalCoercedNumber(z.coerce.number().min(0)),
  isDeductPagibig: z.boolean().default(true),
  pagibigDeductionMode: z.enum(statutoryDeductionModeValues).default("TABLE"),
  pagibigCustomAmountEe: optionalCoercedNumber(z.coerce.number().min(0)),
  pagibigCustomAmountEr: optionalCoercedNumber(z.coerce.number().min(0)),
  isDeductWithholdingTax: z.boolean().default(true),
  employeeType: z.enum(employeeTypeValues),
  isManagerialExempt: z.boolean().default(false),
  dateHired: z.string().min(1, "Required"),
  departmentName: z.string().optional(),
  positionTitle: z.string().min(1, "Required"),
  rank: z.string().optional().nullable(),
  scheduleType: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAccountNumber: z.string().optional().nullable(),
  bankBranch: z.string().optional().nullable(),
  paymentMethod: z.enum(paymentMethodValues).optional().default("BANK_TRANSFER"),
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
  "RETAINER",
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
export const updateTypeValues = ["BASIC", "ALLOWANCE", "BOTH"] as const;

export const compensationRecordSchema = z.object({
  updateType: z.enum(updateTypeValues).default("BOTH"),
  effectiveFrom: z.string().min(1, "Required"),
  payBasis: z.enum(payBasisValues).optional(),
  basicRate: optionalCoercedNumber(z.coerce.number().positive()),
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
  middleName: z.string().optional().nullable(),
  birthDate: z.string().min(1).optional(),
  dateHired: z.string().optional().nullable().or(z.literal("")),
  sex: z.enum(sexValues).optional(),
  civilStatus: z.enum(civilStatusValues).optional(),
  personalEmail: z.string().email("Invalid email").optional().or(z.literal("")).nullable(),
  mobileNumber: z.string().optional().nullable(),
  currentAddress: z.string().optional().nullable(),
  permanentAddress: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactRelationship: z.string().optional().nullable(),
  emergencyContactNumber: z.string().optional().nullable(),
  emergencyContactAddress: z.string().optional().nullable(),
  tin: z.string().optional().nullable().or(z.literal("")),
  sssNumber: z.string().optional().nullable().or(z.literal("")),
  philhealthNumber: z.string().optional().nullable().or(z.literal("")),
  pagibigNumber: z.string().optional().nullable().or(z.literal("")),
  isDeductSss: z.boolean().optional(),
  sssDeductionMode: z.enum(statutoryDeductionModeValues).optional(),
  sssCustomAmountEe: optionalCoercedNumber(z.coerce.number().min(0)),
  sssCustomAmountEr: optionalCoercedNumber(z.coerce.number().min(0)),
  isDeductPhilhealth: z.boolean().optional(),
  philhealthDeductionMode: z.enum(statutoryDeductionModeValues).optional(),
  philhealthCustomAmountEe: optionalCoercedNumber(z.coerce.number().min(0)),
  philhealthCustomAmountEr: optionalCoercedNumber(z.coerce.number().min(0)),
  isDeductPagibig: z.boolean().optional(),
  pagibigDeductionMode: z.enum(statutoryDeductionModeValues).optional(),
  pagibigCustomAmountEe: optionalCoercedNumber(z.coerce.number().min(0)),
  pagibigCustomAmountEr: optionalCoercedNumber(z.coerce.number().min(0)),
  isDeductWithholdingTax: z.boolean().optional(),
  positionTitle: z.string().min(1).optional(),
  departmentName: z.string().optional().nullable(),
  rank: z.string().optional().nullable(),
  scheduleType: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAccountNumber: z.string().optional().nullable(),
  bankBranch: z.string().optional().nullable(),
  paymentMethod: z.enum(paymentMethodValues).optional(),
  photoUrl: z.string().optional().nullable(),
  employmentStatus: z.enum(employmentStatusValues).optional(),
  isManagerialExempt: z.boolean().optional(),
  managerialExemptReason: z.string().optional().nullable(),
  dateSeparated: z.string().optional().nullable().or(z.literal("")),
  separationReason: z.string().optional().nullable(),
  separationCategory: z.enum(separationCategoryValues).optional(),
  clearanceCompleted: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});
export type UpdateEmployeeInput = z.output<typeof updateEmployeeSchema>;

export const editEmployeeProfileSchema = z.object({
  employeeNumber: z.string().min(1, "Required"),
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  middleName: z.string().optional().nullable(),
  birthDate: z.string().min(1, "Required"),
  dateHired: z.string().optional().nullable().or(z.literal("")),
  sex: z.enum(sexValues),
  civilStatus: z.enum(civilStatusValues),
  personalEmail: z.string().email("Invalid email").optional().or(z.literal("")).nullable(),
  mobileNumber: z.string().optional().nullable(),
  currentAddress: z.string().optional().nullable(),
  permanentAddress: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactRelationship: z.string().optional().nullable(),
  emergencyContactNumber: z.string().optional().nullable(),
  emergencyContactAddress: z.string().optional().nullable(),
  positionTitle: z.string().min(1, "Required"),
  departmentName: z.string().optional().nullable(),
  rank: z.string().optional().nullable(),
  scheduleType: z.string().optional().nullable(),
  isManagerialExempt: z.boolean().default(false),
  bankName: z.string().optional().nullable(),
  bankAccountNumber: z.string().optional().nullable(),
  bankBranch: z.string().optional().nullable(),
  paymentMethod: z.enum(paymentMethodValues).optional().default("BANK_TRANSFER"),
  photoUrl: z.string().optional().nullable(),
  employmentStatus: z.enum(employmentStatusValues).optional(),
  tin: z.string().optional().nullable().or(z.literal("")),
  sssNumber: z.string().optional().nullable().or(z.literal("")),
  philhealthNumber: z.string().optional().nullable().or(z.literal("")),
  pagibigNumber: z.string().optional().nullable().or(z.literal("")),
  isDeductSss: z.boolean().default(true),
  sssDeductionMode: z.enum(statutoryDeductionModeValues).default("TABLE"),
  sssCustomAmountEe: optionalCoercedNumber(z.coerce.number().min(0)),
  sssCustomAmountEr: optionalCoercedNumber(z.coerce.number().min(0)),
  isDeductPhilhealth: z.boolean().default(true),
  philhealthDeductionMode: z.enum(statutoryDeductionModeValues).default("TABLE"),
  philhealthCustomAmountEe: optionalCoercedNumber(z.coerce.number().min(0)),
  philhealthCustomAmountEr: optionalCoercedNumber(z.coerce.number().min(0)),
  isDeductPagibig: z.boolean().default(true),
  pagibigDeductionMode: z.enum(statutoryDeductionModeValues).default("TABLE"),
  pagibigCustomAmountEe: optionalCoercedNumber(z.coerce.number().min(0)),
  pagibigCustomAmountEr: optionalCoercedNumber(z.coerce.number().min(0)),
  isDeductWithholdingTax: z.boolean().default(true),
});
export type EditEmployeeProfileFormValues = z.input<typeof editEmployeeProfileSchema>;
export type EditEmployeeProfileInput = z.output<typeof editEmployeeProfileSchema>;

// One row of the spreadsheet-style bulk-edit table. Profile fields plus the
// employee's CURRENT pay rate — not the full effective-dated compensation
// history, which still goes through "New rate" per employee since it's a
// point-in-time snapshot, not a value to be blanket-edited.
export const bulkEmployeeRowSchema = z.object({
  employeeId: z.string().min(1),
  companyName: z.string().optional(),
  employeeNumber: z.string().min(1, "Required"),
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  middleName: z.string().optional(),
  birthDate: z.string().min(1, "Required"),
  dateHired: z.string().optional(),
  sex: z.enum(sexValues),
  civilStatus: z.enum(civilStatusValues),
  positionTitle: z.string().min(1, "Required"),
  departmentName: z.string().optional(),
  rank: z.string().optional(),
  scheduleType: z.string().optional(),
  tin: z.string().optional(),
  sssNumber: z.string().optional(),
  philhealthNumber: z.string().optional(),
  pagibigNumber: z.string().optional(),
  personalEmail: z.string().optional(),
  mobileNumber: z.string().optional(),
  currentAddress: z.string().optional(),
  permanentAddress: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  emergencyContactNumber: z.string().optional(),
  emergencyContactAddress: z.string().optional(),
  paymentMethod: z.enum(paymentMethodValues).optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankBranch: z.string().optional(),
  isManagerialExempt: z.boolean().default(false),
  isDeductSss: z.boolean().default(true),
  isDeductPhilhealth: z.boolean().default(true),
  isDeductPagibig: z.boolean().default(true),
  isDeductWithholdingTax: z.boolean().default(true),
  payBasis: z.enum(payBasisValues).optional(),
  basicRate: z.coerce.number().min(0, "Must be 0 or greater").optional(),
});
export type BulkEmployeeRow = z.output<typeof bulkEmployeeRowSchema>;

export const bulkUpdateEmployeesSchema = z.object({
  rows: z.array(bulkEmployeeRowSchema).min(1),
});

export const deleteEmployeeSchema = z.object({
  reason: z.string().trim().min(3, "Please provide a valid deletion reason (at least 3 characters)"),
});
export type DeleteEmployeeInput = z.infer<typeof deleteEmployeeSchema>;
