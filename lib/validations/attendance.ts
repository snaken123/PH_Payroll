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

export const generateDefaultEntriesSchema = z.object({
  employeeId: z.string().min(1),
  start: z.string().min(1),
  end: z.string().min(1),
});
export type GenerateDefaultEntriesInput = z.infer<typeof generateDefaultEntriesSchema>;
