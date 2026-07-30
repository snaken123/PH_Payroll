import { z } from "zod";

export const holidayTypeValues = ["REGULAR_HOLIDAY", "SPECIAL_NON_WORKING"] as const;
export const timesheetStatusValues = [
  "PRESENT",
  "ABSENT",
  "HALF_DAY",
  "LEAVE",
  "HOLIDAY",
  "REST_DAY",
] as const;

export const createHolidaySchema = z.object({
  date: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  holidayType: z.enum(holidayTypeValues),
  region: z.string().optional(),
});
export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;

export const upsertTimesheetSchema = z.object({
  employeeId: z.string().min(1),
  workDate: z.string().min(1),
  status: z.enum(timesheetStatusValues),
  scheduledHours: z.coerce.number().min(0).default(8),
  lateMinutes: z.coerce.number().int().min(0).default(0),
  undertimeMinutes: z.coerce.number().int().min(0).default(0),
  regularHours: z.coerce.number().min(0).default(0),
  overtimeHours: z.coerce.number().min(0).default(0),
  nightDiffHours: z.coerce.number().min(0).default(0),
  holidayType: z.enum(holidayTypeValues).optional().nullable(),
  isRestDay: z.boolean().default(false),
});
export type UpsertTimesheetFormValues = z.input<typeof upsertTimesheetSchema>;
export type UpsertTimesheetInput = z.output<typeof upsertTimesheetSchema>;

// Client-only shape for EditTimesheetDialog — mirrors upsertTimesheetSchema's
// fields but keeps holidayType as an empty-string sentinel (the Select's
// "None" option) instead of null, since RHF/Radix-style selects need a
// non-null value to bind to. Converted to null right before the POST body
// is built, then upsertTimesheetSchema validates the actual request server-side.
export const timesheetFormSchema = z.object({
  status: z.enum(timesheetStatusValues),
  scheduledHours: z.coerce.number().min(0),
  lateMinutes: z.coerce.number().int().min(0),
  undertimeMinutes: z.coerce.number().int().min(0),
  regularHours: z.coerce.number().min(0),
  overtimeHours: z.coerce.number().min(0),
  nightDiffHours: z.coerce.number().min(0),
  holidayType: z.union([z.enum(holidayTypeValues), z.literal("")]),
  isRestDay: z.boolean(),
});
export type TimesheetFormValues = z.input<typeof timesheetFormSchema>;
export type TimesheetFormInput = z.output<typeof timesheetFormSchema>;

export const generateDefaultEntriesSchema = z.object({
  employeeId: z.string().min(1),
  start: z.string().min(1),
  end: z.string().min(1),
});
export type GenerateDefaultEntriesInput = z.infer<typeof generateDefaultEntriesSchema>;
