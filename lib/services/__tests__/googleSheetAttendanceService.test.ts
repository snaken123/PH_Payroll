import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {},
}));

import {
  extractGoogleSheetDetails,
  parseSpreadsheetDate,
  enumerateDates,
  processAttendanceSpreadsheet,
} from "../googleSheetAttendanceService";

describe("googleSheetAttendanceService", () => {
  describe("extractGoogleSheetDetails", () => {
    it("extracts sheetId and gid from standard Google Sheets URL", () => {
      const url =
        "https://docs.google.com/spreadsheets/d/1fLJSufb7T78yxBR4tbdpjzl7-eaoaPGQpnH6dHUyBEU/edit?gid=1470356305#gid=1470356305";
      const res = extractGoogleSheetDetails(url);
      expect(res.sheetId).toBe("1fLJSufb7T78yxBR4tbdpjzl7-eaoaPGQpnH6dHUyBEU");
      expect(res.gid).toBe("1470356305");
      expect(res.csvUrl).toBe(
        "https://docs.google.com/spreadsheets/d/1fLJSufb7T78yxBR4tbdpjzl7-eaoaPGQpnH6dHUyBEU/export?format=csv&gid=1470356305"
      );
    });

    it("defaults gid to 0 if not provided", () => {
      const url = "https://docs.google.com/spreadsheets/d/abc123xyz/edit";
      const res = extractGoogleSheetDetails(url);
      expect(res.sheetId).toBe("abc123xyz");
      expect(res.gid).toBe("0");
    });

    it("throws error on invalid URL", () => {
      expect(() => extractGoogleSheetDetails("https://example.com/not-sheets")).toThrow(
        "Invalid Google Spreadsheet link"
      );
    });
  });

  describe("parseSpreadsheetDate", () => {
    it("parses YYYY-MM-DD and YYYY/MM/DD", () => {
      expect(parseSpreadsheetDate("2026-10-01")).toBe("2026-10-01");
      expect(parseSpreadsheetDate("2026/10/01")).toBe("2026-10-01");
    });

    it("parses MM/DD/YYYY", () => {
      expect(parseSpreadsheetDate("10/01/2026")).toBe("2026-10-01");
      expect(parseSpreadsheetDate("9/26/2026")).toBe("2026-09-26");
    });

    it("returns null on invalid date", () => {
      expect(parseSpreadsheetDate("invalid")).toBeNull();
      expect(parseSpreadsheetDate("")).toBeNull();
    });
  });

  describe("processAttendanceSpreadsheet", () => {
    const mockCompany = {
      id: "cmtirx69r000004l5fs955yqa",
      legalName: "GPFresh",
      tradeName: "GPFresh Organics",
      companyCode: "GPFRESH1",
      attendanceStandardTimeIn: "09:30",
      attendanceStandardTimeOut: "18:30",
      attendanceLunchBreakMinutes: 60,
      attendanceLateGracePeriodMinutes: 15,
      attendanceOtGracePeriodMinutes: 15,
    };

    const mockEmployees = [
      {
        id: "emp-1",
        employeeNumber: "GPFO-01",
        firstName: "Myla",
        lastName: "Crispino",
        scheduleType: "REGULAR",
      },
      {
        id: "emp-2",
        employeeNumber: "GPFO-03",
        firstName: "Jasper",
        lastName: "Pulgarinas",
        scheduleType: "REGULAR",
      },
    ];

    it("fails Rule 1 when Company ID is missing or mismatched", () => {
      const csv = `Company ID,WRONG_COMPANY,,
Start,2026-10-01,,
End,2026-10-15,,
,,,
User ID,User Name,Check Time,Status
GPFO-03,Jasper,2026/10/01 09:00:00,IN`;

      expect(() =>
        processAttendanceSpreadsheet({
          csvText: csv,
          company: mockCompany,
          employees: mockEmployees,
          holidays: [],
          appStart: "2026-10-01",
          appEnd: "2026-10-15",
        })
      ).toThrow(/Company ID mismatch/);
    });

    it("fails Rule 2 when Start Date does not match app cutoff start", () => {
      const csv = `Company ID,GPFRESH1,,
Start,2026-10-05,,
End,2026-10-15,,
,,,
User ID,User Name,Check Time,Status
GPFO-03,Jasper,2026/10/05 09:00:00,IN`;

      expect(() =>
        processAttendanceSpreadsheet({
          csvText: csv,
          company: mockCompany,
          employees: mockEmployees,
          holidays: [],
          appStart: "2026-10-01",
          appEnd: "2026-10-15",
        })
      ).toThrow(/Start date mismatch/);
    });

    it("fails Rule 3 when End Date does not match app cutoff end", () => {
      const csv = `Company ID,GPFRESH1,,
Start,2026-10-01,,
End,2026-10-20,,
,,,
User ID,User Name,Check Time,Status
GPFO-03,Jasper,2026/10/01 09:00:00,IN`;

      expect(() =>
        processAttendanceSpreadsheet({
          csvText: csv,
          company: mockCompany,
          employees: mockEmployees,
          holidays: [],
          appStart: "2026-10-01",
          appEnd: "2026-10-15",
        })
      ).toThrow(/End date mismatch/);
    });

    it("processes valid attendance and applies Rule 5 (tags absent on days without login)", () => {
      // 2026-10-01 (Thu) to 2026-10-04 (Sun)
      // 10-01: Jasper IN 09:00, OUT 18:30 (present)
      // 10-02 (Fri): no login -> absent
      // 10-03 (Sat): no login -> absent
      // 10-04 (Sun): rest day
      const csv = `Company ID,GPFRESH1,,
Start,2026-10-01,,
End,2026-10-04,,
,,,
User ID,User Name,Check Time,Status
GPFO-03,Jasper,2026/10/01 09:00:00,IN
GPFO-03,Jasper,2026/10/01 18:30:00,OUT`;

      const result = processAttendanceSpreadsheet({
        csvText: csv,
        company: mockCompany,
        employees: mockEmployees,
        holidays: [],
        appStart: "2026-10-01",
        appEnd: "2026-10-04",
      });

      expect(result.success).toBe(true);
      expect(result.summary.totalEmployees).toBe(2);

      // Jasper: 1 present, 2 absent, 1 rest day
      const jasperSummary = result.summary.employees.find((e) => e.employeeNumber === "GPFO-03");
      expect(jasperSummary).toBeDefined();
      expect(jasperSummary?.presentDays).toBe(1);
      expect(jasperSummary?.absentDays).toBe(2);
      expect(jasperSummary?.restDays).toBe(1);

      // Myla: 0 present, 3 absent, 1 rest day
      const mylaSummary = result.summary.employees.find((e) => e.employeeNumber === "GPFO-01");
      expect(mylaSummary).toBeDefined();
      expect(mylaSummary?.presentDays).toBe(0);
      expect(mylaSummary?.absentDays).toBe(3);
      expect(mylaSummary?.restDays).toBe(1);
    });
  });
});
