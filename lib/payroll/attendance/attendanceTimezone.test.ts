import { describe, it, expect } from "vitest";
import { combineDateAndTime, extractTimeOfDay } from "@/lib/validations/attendance";
import { calculateTimesheetHours } from "@/lib/attendance/calculateHours";

describe("Attendance Timezone & Schedule Alignment", () => {
  it("should format timeOfDay consistently in Asia/Manila (PHT) timezone", () => {
    // 09:30 AM in Philippine Time (+08:00)
    const date = combineDateAndTime("2026-09-17", "09:30");
    expect(date).not.toBeNull();
    const formatted = extractTimeOfDay(date);
    expect(formatted).toBe("09:30");
  });

  it("should extract correct HH:MM for time-in recorded late evening (23:45)", () => {
    const date = combineDateAndTime("2026-09-17", "23:45");
    expect(date).not.toBeNull();
    const formatted = extractTimeOfDay(date);
    expect(formatted).toBe("23:45");
  });

  it("should extract correct HH:MM for time-in recorded early morning (00:15)", () => {
    const date = combineDateAndTime("2026-09-17", "00:15");
    expect(date).not.toBeNull();
    const formatted = extractTimeOfDay(date);
    expect(formatted).toBe("00:15");
  });

  it("should maintain round-trip idempotency across all hours of the day", () => {
    for (let h = 0; h < 24; h++) {
      const hh = String(h).padStart(2, "0");
      const timeStr = `${hh}:30`;
      const date = combineDateAndTime("2026-09-17", timeStr);
      expect(extractTimeOfDay(date)).toBe(timeStr);
    }
  });

  it("should handle full ISO workDate strings safely without date string corruption", () => {
    const date = combineDateAndTime("2026-09-17T00:00:00.000Z", "09:30");
    expect(date).not.toBeNull();
    expect(extractTimeOfDay(date)).toBe("09:30");
  });

  it("should fallback to 09:30 standard time in REGULAR schedule when config standard times are undefined", () => {
    const res = calculateTimesheetHours({
      scheduleType: "Regular",
      timeIn: "09:30",
      timeOut: "18:30",
    });

    expect(res.lateMinutes).toBe(0);
    expect(res.undertimeMinutes).toBe(0);
    expect(res.regularHours).toBe(8.0);
  });
});

