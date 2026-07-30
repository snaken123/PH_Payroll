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

// "HH:MM" (24hr) — combined with workDate to build the stored DateTime, or
// left empty/undefined for no punch recorded that day.
const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM").optional().or(z.literal(""));

export const upsertTimesheetSchema = z.object({
  employeeId: z.string().min(1),
  workDate: z.string().min(1),
  status: z.enum(timesheetStatusValues),
  timeIn: timeOfDay,
  timeOut: timeOfDay,
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
  timeIn: timeOfDay,
  timeOut: timeOfDay,
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

/** Combines a "YYYY-MM-DD" workDate with an "HH:MM" time into a stored
 * DateTime, or null if no time was given — timeIn/timeOut are optional
 * punches, not every entry has them. */
export function combineDateAndTime(workDate: string, time: string | null | undefined): Date | null {
  if (!time) return null;
  return new Date(`${workDate}T${time}:00`);
}

/** Inverse of combineDateAndTime, for populating a form from a stored entry. */
export function extractTimeOfDay(dateTime: Date | string | null | undefined): string {
  if (!dateTime) return "";
  const d = typeof dateTime === "string" ? new Date(dateTime) : dateTime;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export const generateDefaultEntriesSchema = z.object({
  employeeId: z.string().min(1),
  start: z.string().min(1),
  end: z.string().min(1),
});
export type GenerateDefaultEntriesInput = z.infer<typeof generateDefaultEntriesSchema>;

export const generateDefaultEntriesForCompanySchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
});
export type GenerateDefaultEntriesForCompanyInput = z.infer<typeof generateDefaultEntriesForCompanySchema>;

export const bulkTimesheetRowSchema = z.object({
  employeeId: z.string().min(1),
  workDate: z.string().min(1),
  status: z.enum(timesheetStatusValues),
  timeIn: timeOfDay,
  timeOut: timeOfDay,
  scheduledHours: z.coerce.number().min(0),
  lateMinutes: z.coerce.number().int().min(0),
  undertimeMinutes: z.coerce.number().int().min(0),
  regularHours: z.coerce.number().min(0),
  overtimeHours: z.coerce.number().min(0),
  nightDiffHours: z.coerce.number().min(0),
  holidayType: z.enum(holidayTypeValues).optional().nullable(),
  isRestDay: z.boolean(),
});
export type BulkTimesheetRow = z.output<typeof bulkTimesheetRowSchema>;

export const bulkUpdateTimesheetsSchema = z.object({
  rows: z.array(bulkTimesheetRowSchema).min(1),
});
