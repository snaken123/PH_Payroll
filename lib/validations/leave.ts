import { z } from "zod";

export const createLeaveRequestSchema = z.object({
  employeeId: z.string().min(1),
  leaveTypeId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().optional(),
});
export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

/** Inclusive calendar-day count between two dates, excluding Sundays —
 * mirrors the rest-day convention used by the attendance bulk-generate. */
export function countLeaveDays(start: Date, end: Date): number {
  let count = 0;
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() !== 0) count++;
  }
  return count;
}
