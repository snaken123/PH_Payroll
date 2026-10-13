import { prisma } from "@/lib/db";
import { calculateTimesheetHours, type CompanyAttendanceConfig } from "@/lib/attendance/calculateHours";

export interface GoogleSheetValidationResult {
  sheetId: string;
  gid: string;
  csvUrl: string;
}

export interface EmployeeAttendanceSummary {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  presentDays: number;
  absentDays: number;
  restDays: number;
  holidayDays: number;
  totalLateMinutes: number;
  totalUndertimeMinutes: number;
  totalOtHours: number;
  totalRegularHours: number;
}

export interface AttendanceImportSummary {
  companyId: string;
  companyName: string;
  companyCode: string;
  startDate: string;
  endDate: string;
  totalEmployees: number;
  totalPresentDays: number;
  totalAbsentDays: number;
  totalLateMinutes: number;
  totalOtHours: number;
  totalRegularHours: number;
  employees: EmployeeAttendanceSummary[];
}

export interface ProcessedTimesheetRow {
  employeeId: string;
  workDate: string;
  status: string;
  timeIn: string;
  timeOut: string;
  scheduledHours: number;
  lateMinutes: number;
  undertimeMinutes: number;
  regularHours: number;
  overtimeHours: number;
  nightDiffHours: number;
  holidayType: string | null;
  isRestDay: boolean;
}

export interface ProcessGoogleSheetResult {
  success: boolean;
  summary: AttendanceImportSummary;
  rows: ProcessedTimesheetRow[];
}

/**
 * Extracts Google Spreadsheet ID and GID from any standard Google Drive or Sheets URL.
 */
export function extractGoogleSheetDetails(rawUrl: string): GoogleSheetValidationResult {
  if (!rawUrl || typeof rawUrl !== "string") {
    throw new Error("Please provide a valid Google Spreadsheet URL.");
  }

  const url = rawUrl.trim();
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/) || url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch || !idMatch[1]) {
    throw new Error("Invalid Google Spreadsheet link. Could not find a valid Spreadsheet ID in the URL.");
  }

  const sheetId = idMatch[1];
  const gidMatch = url.match(/[?&#]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : "0";

  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  return { sheetId, gid, csvUrl };
}

/**
 * Robust CSV string parser handling quotes, escaped quotes, commas, and line endings.
 */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentCell.trim());
        currentCell = "";
      } else if (char === "\r") {
        // ignore CR
      } else if (char === "\n") {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Normalizes any spreadsheet date string into YYYY-MM-DD.
 */
export function parseSpreadsheetDate(raw?: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 1. YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, "0");
    const d = ymdMatch[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // 2. MM/DD/YYYY or M/D/YYYY
  const mdyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (mdyMatch) {
    const m = mdyMatch[1].padStart(2, "0");
    const d = mdyMatch[2].padStart(2, "0");
    const y = mdyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // 3. Fallback date parse
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return null;
}

/**
 * Enumerates all dates between start and end (inclusive) in YYYY-MM-DD format.
 */
export function enumerateDates(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + "T00:00:00");
  const stop = new Date(end + "T00:00:00");
  while (cur <= stop) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export interface ProcessGoogleSheetOptions {
  csvText: string;
  company: {
    id: string;
    legalName: string;
    tradeName?: string | null;
    companyCode: string;
    attendanceStandardTimeIn?: string;
    attendanceStandardTimeOut?: string;
    attendanceLunchBreakMinutes?: number;
    attendanceLateGracePeriodMinutes?: number;
    attendanceOtGracePeriodMinutes?: number;
    attendanceFlexi1WindowStart?: string;
    attendanceFlexi1WindowEnd?: string;
    attendanceFlexi1LateGracePeriodMinutes?: number;
  };
  employees: Array<{
    id: string;
    employeeNumber: string;
    firstName: string;
    lastName: string;
    scheduleType?: string | null;
    dateSeparated?: Date | null;
  }>;
  holidays: Array<{
    date: Date;
    holidayType: string;
  }>;
  appStart: string; // YYYY-MM-DD
  appEnd: string;   // YYYY-MM-DD
}

/**
 * Validates Rules 1, 2, 3, 4, 5 and processes attendance logs.
 */
export function processAttendanceSpreadsheet(options: ProcessGoogleSheetOptions): ProcessGoogleSheetResult {
  const { csvText, company, employees, holidays, appStart, appEnd } = options;

  const rows = parseCsvText(csvText);
  if (rows.length === 0) {
    throw new Error("The spreadsheet is empty. Please verify the link and sheet content.");
  }

  // Find Cell B1 (Company ID), B2 (Start), B3 (End)
  // Support both exact cell positions and label-based lookup
  let cellB1 = (rows[0]?.[1] || "").trim();
  let cellB2 = (rows[1]?.[1] || "").trim();
  let cellB3 = (rows[2]?.[1] || "").trim();

  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const col0 = (rows[r]?.[0] || "").trim().toLowerCase();
    const col1 = (rows[r]?.[1] || "").trim();
    if (col0.includes("company") && !cellB1) cellB1 = col1;
    if (col0 === "start" && !cellB2) cellB2 = col1;
    if (col0 === "end" && !cellB3) cellB3 = col1;
  }

  // ==================== RULE 1: Company ID Check ====================
  if (!cellB1) {
    throw new Error(
      `Company ID missing in Cell B1: Cell B1 is empty in the spreadsheet. Expected Company ID or code matching active company "${company.legalName}" (${company.companyCode}).`
    );
  }

  const b1Lower = cellB1.toLowerCase();
  const isCompanyMatch =
    b1Lower === company.id.toLowerCase() ||
    b1Lower === company.companyCode.toLowerCase() ||
    b1Lower === company.legalName.toLowerCase() ||
    (company.tradeName && b1Lower === company.tradeName.toLowerCase());

  if (!isCompanyMatch) {
    throw new Error(
      `Company ID mismatch: Cell B1 specifies "${cellB1}", but your active company is "${company.legalName}" (Company Code: "${company.companyCode}").`
    );
  }

  // ==================== RULE 2: Start Date Check ====================
  if (!cellB2) {
    throw new Error(
      `Start date missing in Cell B2: Cell B2 is empty in the spreadsheet. Expected start date "${appStart}".`
    );
  }

  const normalizedB2 = parseSpreadsheetDate(cellB2);
  const normalizedAppStart = parseSpreadsheetDate(appStart) || appStart;

  if (!normalizedB2 || normalizedB2 !== normalizedAppStart) {
    throw new Error(
      `Start date mismatch: Cell B2 specifies "${cellB2}" (normalized: ${normalizedB2 || "invalid"}), but the selected cutoff start date in the app is "${appStart}".`
    );
  }

  // ==================== RULE 3: End Date Check ====================
  if (!cellB3) {
    throw new Error(
      `End date missing in Cell B3: Cell B3 is empty in the spreadsheet. Expected end date "${appEnd}".`
    );
  }

  const normalizedB3 = parseSpreadsheetDate(cellB3);
  const normalizedAppEnd = parseSpreadsheetDate(appEnd) || appEnd;

  if (!normalizedB3 || normalizedB3 !== normalizedAppEnd) {
    throw new Error(
      `End date mismatch: Cell B3 specifies "${cellB3}" (normalized: ${normalizedB3 || "invalid"}), but the selected cutoff end date in the app is "${appEnd}".`
    );
  }

  // ==================== RULE 4: Read Attendance & Match USERID ====================
  // Locate header row (where columns contain User ID and Check Time)
  let headerRowIndex = -1;
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const rowStr = rows[r].map((c) => c.toLowerCase()).join(",");
    if (rowStr.includes("user id") || (rowStr.includes("check time") && rowStr.includes("status"))) {
      headerRowIndex = r;
      break;
    }
  }

  if (headerRowIndex === -1) {
    headerRowIndex = 4; // default row 5 (0-indexed 4)
  }

  interface RawPunch {
    userId: string;
    userName: string;
    date: string;
    time: string;
    status: string;
  }

  const punches: RawPunch[] = [];
  const foundUserIds = new Set<string>();

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < 3) continue;
    const userId = (row[0] || "").trim();
    const userName = (row[1] || "").trim();
    const checkTimeStr = (row[2] || "").trim();
    const status = (row[3] || "").trim().toUpperCase();

    if (!userId || !checkTimeStr) continue;
    foundUserIds.add(userId);

    const [dPart, tPart] = checkTimeStr.split(" ");
    const dNorm = parseSpreadsheetDate(dPart);
    if (!dNorm) continue;

    // Time normalized to HH:mm
    const timeNorm = (tPart || "").slice(0, 5);

    punches.push({
      userId,
      userName,
      date: dNorm,
      time: timeNorm,
      status: status || "IN",
    });
  }

  if (punches.length === 0) {
    throw new Error("No attendance check-in/out records found in the spreadsheet starting after row 5.");
  }

  // Employee matching map
  // 1. Exact employeeNumber (e.g. GPFO-04 -> GPFO-04)
  // 2. Numeric suffix / biometric ID (e.g. 4 -> GPFO-04, 1 -> GPFD-01)
  function resolveEmployee(userId: string, userName: string) {
    const uClean = userId.trim().toUpperCase();

    // 1. Exact employeeNumber
    const exact = employees.find((e) => e.employeeNumber.trim().toUpperCase() === uClean);
    if (exact) return exact;

    // 2. Number match: if userId is a number like "4" or "04"
    const numVal = parseInt(uClean, 10);
    if (!isNaN(numVal)) {
      const matchByNumber = employees.find((e) => {
        const empDigits = e.employeeNumber.replace(/\D/g, "");
        if (empDigits && parseInt(empDigits, 10) === numVal) return true;
        // Also check if ends with -4 or -04
        if (e.employeeNumber.endsWith(`-${numVal}`) || e.employeeNumber.endsWith(`-0${numVal}`)) return true;
        return false;
      });
      if (matchByNumber) return matchByNumber;
    }

    // 3. Fallback: match by userName against firstName or lastName
    if (userName) {
      const nameClean = userName.toLowerCase().replace(/[^a-z]/g, "");
      if (nameClean.length >= 3) {
        const matchByName = employees.find((e) => {
          const fn = e.firstName.toLowerCase().replace(/[^a-z]/g, "");
          const ln = e.lastName.toLowerCase().replace(/[^a-z]/g, "");
          return fn.includes(nameClean) || nameClean.includes(fn) || ln.includes(nameClean);
        });
        if (matchByName) return matchByName;
      }
    }

    return null;
  }

  // Check if at least one employee in the company matches
  const matchedEmployees = new Map<string, typeof employees[0]>();
  for (const uid of foundUserIds) {
    const emp = resolveEmployee(uid, "");
    if (emp) {
      matchedEmployees.set(emp.id, emp);
    }
  }

  if (matchedEmployees.size === 0) {
    const sampleIds = Array.from(foundUserIds).slice(0, 8).join(", ");
    throw new Error(
      `No matching employees found: None of the User IDs in the spreadsheet (${sampleIds}) match active employees in "${company.legalName}".`
    );
  }

  // Prepare holiday lookup
  const holidayMap = new Map<string, string>();
  for (const h of holidays) {
    const dStr = h.date.toISOString().slice(0, 10);
    holidayMap.set(dStr, h.holidayType);
  }

  // Company attendance config for calculateTimesheetHours
  const attendanceConfig: CompanyAttendanceConfig = {
    attendanceStandardTimeIn: company.attendanceStandardTimeIn,
    attendanceStandardTimeOut: company.attendanceStandardTimeOut,
    attendanceLunchBreakMinutes: company.attendanceLunchBreakMinutes,
    attendanceLateGracePeriodMinutes: company.attendanceLateGracePeriodMinutes,
    attendanceOtGracePeriodMinutes: company.attendanceOtGracePeriodMinutes,
    attendanceFlexi1WindowStart: company.attendanceFlexi1WindowStart,
    attendanceFlexi1WindowEnd: company.attendanceFlexi1WindowEnd,
    attendanceFlexi1LateGracePeriodMinutes: company.attendanceFlexi1LateGracePeriodMinutes,
  };

  const cutoffDates = enumerateDates(appStart, appEnd);

  // Group punches by employee ID
  const punchesByEmpId = new Map<string, RawPunch[]>();
  for (const p of punches) {
    const emp = resolveEmployee(p.userId, p.userName);
    if (emp) {
      if (!punchesByEmpId.has(emp.id)) punchesByEmpId.set(emp.id, []);
      punchesByEmpId.get(emp.id)!.push(p);
    }
  }

  const processedRows: ProcessedTimesheetRow[] = [];
  const employeeSummaries: EmployeeAttendanceSummary[] = [];

  let grandPresentDays = 0;
  let grandAbsentDays = 0;
  let grandLateMinutes = 0;
  let grandOtHours = 0;
  let grandRegularHours = 0;

  // Process all employees of the company that are active in this cutoff
  for (const emp of employees) {
    const empPunches = punchesByEmpId.get(emp.id) || [];
    const sepDateStr = emp.dateSeparated ? emp.dateSeparated.toISOString().slice(0, 10) : null;

    let presentDays = 0;
    let absentDays = 0;
    let restDays = 0;
    let holidayDays = 0;
    let totalLate = 0;
    let totalUndertime = 0;
    let totalOt = 0;
    let totalReg = 0;

    for (const workDate of cutoffDates) {
      const isSunday = new Date(workDate + "T00:00:00").getDay() === 0;
      const holidayType = holidayMap.get(workDate) || null;
      const isSeparated = sepDateStr && workDate > sepDateStr;

      const dayPunches = empPunches.filter((p) => p.date === workDate);

      // ==================== RULE 5: Tag as Absent if no login and not a rest day ====================
      if (dayPunches.length === 0) {
        if (isSeparated || isSunday) {
          restDays++;
          processedRows.push({
            employeeId: emp.id,
            workDate,
            status: "REST_DAY",
            timeIn: "",
            timeOut: "",
            scheduledHours: 0,
            lateMinutes: 0,
            undertimeMinutes: 0,
            regularHours: 0,
            overtimeHours: 0,
            nightDiffHours: 0,
            holidayType,
            isRestDay: true,
          });
        } else if (holidayType) {
          holidayDays++;
          processedRows.push({
            employeeId: emp.id,
            workDate,
            status: "HOLIDAY",
            timeIn: "",
            timeOut: "",
            scheduledHours: 8,
            lateMinutes: 0,
            undertimeMinutes: 0,
            regularHours: 0,
            overtimeHours: 0,
            nightDiffHours: 0,
            holidayType,
            isRestDay: false,
          });
        } else {
          // Absent
          absentDays++;
          processedRows.push({
            employeeId: emp.id,
            workDate,
            status: "ABSENT",
            timeIn: "",
            timeOut: "",
            scheduledHours: 0,
            lateMinutes: 0,
            undertimeMinutes: 0,
            regularHours: 0,
            overtimeHours: 0,
            nightDiffHours: 0,
            holidayType: null,
            isRestDay: false,
          });
        }
      } else {
        // PRESENT: calculate hours
        presentDays++;
        const ins = dayPunches.filter((p) => p.status === "IN").map((p) => p.time).sort();
        const outs = dayPunches.filter((p) => p.status === "OUT").map((p) => p.time).sort();
        const allTimes = dayPunches.map((p) => p.time).sort();

        const timeIn = ins[0] || allTimes[0] || "";
        const timeOut = outs[outs.length - 1] || allTimes[allTimes.length - 1] || "";

        const calc = calculateTimesheetHours({
          scheduleType: emp.scheduleType,
          timeIn,
          timeOut,
          config: attendanceConfig,
        });

        totalLate += calc.lateMinutes;
        totalUndertime += calc.undertimeMinutes;
        totalOt += calc.overtimeHours;
        totalReg += calc.regularHours;

        processedRows.push({
          employeeId: emp.id,
          workDate,
          status: "PRESENT",
          timeIn,
          timeOut,
          scheduledHours: 8,
          lateMinutes: calc.lateMinutes,
          undertimeMinutes: calc.undertimeMinutes,
          regularHours: calc.regularHours,
          overtimeHours: calc.overtimeHours,
          nightDiffHours: 0,
          holidayType,
          isRestDay: isSunday,
        });
      }
    }

    grandPresentDays += presentDays;
    grandAbsentDays += absentDays;
    grandLateMinutes += totalLate;
    grandOtHours += totalOt;
    grandRegularHours += totalReg;

    employeeSummaries.push({
      employeeId: emp.id,
      employeeNumber: emp.employeeNumber,
      employeeName: `${emp.lastName}, ${emp.firstName}`,
      presentDays,
      absentDays,
      restDays,
      holidayDays,
      totalLateMinutes: totalLate,
      totalUndertimeMinutes: totalUndertime,
      totalOtHours: Math.round(totalOt * 100) / 100,
      totalRegularHours: Math.round(totalReg * 100) / 100,
    });
  }

  return {
    success: true,
    summary: {
      companyId: company.id,
      companyName: company.legalName,
      companyCode: company.companyCode,
      startDate: appStart,
      endDate: appEnd,
      totalEmployees: employees.length,
      totalPresentDays: grandPresentDays,
      totalAbsentDays: grandAbsentDays,
      totalLateMinutes: grandLateMinutes,
      totalOtHours: Math.round(grandOtHours * 100) / 100,
      totalRegularHours: Math.round(grandRegularHours * 100) / 100,
      employees: employeeSummaries,
    },
    rows: processedRows,
  };
}

/**
 * High-level function that fetches the Google Sheet, verifies all rules,
 * processes the rows, and optionally saves them to the database.
 */
export async function fetchGoogleSheetAndProcess(params: {
  url: string;
  companyId: string;
  start: string;
  end: string;
  autoSave?: boolean;
}): Promise<ProcessGoogleSheetResult> {
  const { url, companyId, start, end, autoSave = false } = params;

  const { csvUrl } = extractGoogleSheetDetails(url);

  let csvText: string;
  try {
    const res = await fetch(csvUrl);
    if (!res.ok) {
      throw new Error(`Google Sheets returned HTTP ${res.status} (${res.statusText}).`);
    }
    csvText = await res.text();
  } catch (err: any) {
    throw new Error(
      `Unable to fetch Google Spreadsheet: ${err.message}. Please ensure the sheet is publicly accessible ("Anyone with the link can view").`
    );
  }

  const [company, employees, holidays] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: {
        id: true,
        legalName: true,
        tradeName: true,
        companyCode: true,
        attendanceStandardTimeIn: true,
        attendanceStandardTimeOut: true,
        attendanceLunchBreakMinutes: true,
        attendanceLateGracePeriodMinutes: true,
        attendanceOtGracePeriodMinutes: true,
        attendanceFlexi1WindowStart: true,
        attendanceFlexi1WindowEnd: true,
        attendanceFlexi1LateGracePeriodMinutes: true,
      },
    }),
    prisma.employee.findMany({
      where: { companyId, isDeleted: false },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        scheduleType: true,
        dateSeparated: true,
      },
      orderBy: { lastName: "asc" },
    }),
    prisma.companyHoliday.findMany({
      where: { companyId },
      select: { date: true, holidayType: true },
    }),
  ]);

  const result = processAttendanceSpreadsheet({
    csvText,
    company,
    employees,
    holidays,
    appStart: start,
    appEnd: end,
  });

  // If autoSave is enabled, persist all rows into TimesheetEntry in the database
  if (autoSave && result.rows.length > 0) {
    await prisma.$transaction(
      result.rows.map((row) =>
        prisma.timesheetEntry.upsert({
          where: {
            employeeId_workDate: {
              employeeId: row.employeeId,
              workDate: new Date(`${row.workDate}T00:00:00.000Z`),
            },
          },
          update: {
            status: row.status as any,
            timeIn: row.timeIn ? new Date(`${row.workDate}T${row.timeIn}:00.000Z`) : null,
            timeOut: row.timeOut ? new Date(`${row.workDate}T${row.timeOut}:00.000Z`) : null,
            scheduledHours: row.scheduledHours,
            lateMinutes: row.lateMinutes,
            undertimeMinutes: row.undertimeMinutes,
            regularHours: row.regularHours,
            overtimeHours: row.overtimeHours,
            nightDiffHours: row.nightDiffHours,
            holidayType: row.holidayType as any,
            isRestDay: row.isRestDay,
          },
          create: {
            companyId,
            employeeId: row.employeeId,
            workDate: new Date(`${row.workDate}T00:00:00.000Z`),
            status: row.status as any,
            timeIn: row.timeIn ? new Date(`${row.workDate}T${row.timeIn}:00.000Z`) : null,
            timeOut: row.timeOut ? new Date(`${row.workDate}T${row.timeOut}:00.000Z`) : null,
            scheduledHours: row.scheduledHours,
            lateMinutes: row.lateMinutes,
            undertimeMinutes: row.undertimeMinutes,
            regularHours: row.regularHours,
            overtimeHours: row.overtimeHours,
            nightDiffHours: row.nightDiffHours,
            holidayType: row.holidayType as any,
            isRestDay: row.isRestDay,
          },
        })
      )
    );
  }

  return result;
}
