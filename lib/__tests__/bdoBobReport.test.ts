import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

describe("BDO BOB Special Report Excel Population Module", () => {
  it("verifies template file exists in public directory and contains Sheet1 with expected header structure", () => {
    const templatePath = path.join(process.cwd(), "public", "BDO ATM Payroll Converter for BOB -.GPFRESH COMPANY INC.xls");
    expect(fs.existsSync(templatePath)).toBe(true);

    const buf = fs.readFileSync(templatePath);
    const wb = XLSX.read(buf, { cellStyles: true, cellFormula: true, bookVBA: true });

    expect(wb.SheetNames).toContain("Sheet1");
    const sheet = wb.Sheets["Sheet1"];

    expect(sheet["A2"]?.v).toBe("Upload Date:");
    expect(sheet["A3"]?.v).toBe("Company Code:");
    expect(sheet["A5"]?.v).toBe("Batch:");

    expect(sheet["A6"]?.v).toBe("ACCOUNT #");
    expect(sheet["B6"]?.v).toBe("AMOUNT");
    expect(sheet["C6"]?.v).toBe("NAME");
    expect(sheet["D6"]?.v).toBe("REMARKS");
  });

  it("populates BDO BOB spreadsheet preserving VBA project and cell metadata", () => {
    const templatePath = path.join(process.cwd(), "public", "BDO ATM Payroll Converter for BOB -.GPFRESH COMPANY INC.xls");
    const buf = fs.readFileSync(templatePath);
    const wb = XLSX.read(buf, { cellStyles: true, cellFormula: true, bookVBA: true, cellDates: true });
    const sheet = wb.Sheets["Sheet1"];

    // 1. Populate metadata
    sheet["B2"] = { v: new Date("2026-09-29"), t: "d", z: "d-mmm-yy" };
    sheet["B3"] = { v: "C86I", t: "s" };
    sheet["B5"] = { v: "1", t: "s" };

    // 2. Populate employee rows
    const mockEmployees = [
      { account: "109876543210", amount: 24500.50, name: "JUAN DELA CRUZ SALAZAR", remarks: "PAYROLL SALARY" },
      { account: "101234567890", amount: 18200.00, name: "MARIA CLARA SANTOS", remarks: "ALLOWANCE" },
    ];

    mockEmployees.forEach((emp, idx) => {
      const rowIdx = 7 + idx;
      sheet[`A${rowIdx}`] = { v: emp.account, t: "s" };
      sheet[`B${rowIdx}`] = { v: emp.amount, t: "n", z: "#,##0.00" };
      sheet[`C${rowIdx}`] = { v: emp.name, t: "s" };
      sheet[`D${rowIdx}`] = { v: emp.remarks, t: "s" };
    });

    sheet["!ref"] = `A1:D${6 + mockEmployees.length}`;

    const outBuf = XLSX.write(wb, { type: "buffer", bookType: "xls", bookVBA: true });
    expect(outBuf.length).toBeGreaterThan(0);

    const reRead = XLSX.read(outBuf, { bookVBA: true });
    expect(reRead.vbaraw).toBeDefined();

    const reSheet = reRead.Sheets["Sheet1"];
    expect(reSheet["A7"]?.v).toBe("109876543210");
    expect(reSheet["B7"]?.v).toBe(24500.50);
    expect(reSheet["C7"]?.v).toBe("JUAN DELA CRUZ SALAZAR");
    expect(reSheet["D7"]?.v).toBe("PAYROLL SALARY");
  });
});
