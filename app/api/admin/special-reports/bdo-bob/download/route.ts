import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import fs from "fs";
import path from "path";
import os from "os";
import { execFileSync } from "child_process";
import * as XLSX from "xlsx";

interface EmployeeSelection {
  employeeId: string;
  payslipId?: string;
  remarks?: string;
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session || session.user.platformRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { runId, uploadDate, companyCode, batch, employeeSelections } = body as {
      runId: string;
      uploadDate: string;
      companyCode: string;
      batch: string;
      employeeSelections: EmployeeSelection[];
    };

    if (!runId || !employeeSelections || employeeSelections.length === 0) {
      return NextResponse.json({ error: "Invalid request: runId and employee selections required" }, { status: 400 });
    }

    // 1. Fetch Payroll Run & Payslips from DB
    const run = await prisma.payrollRun.findUnique({
      where: { id: runId },
      include: {
        company: { select: { id: true, legalName: true, companyCode: true } },
        payrollPeriod: true,
        payslips: {
          include: {
            employee: true,
          },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });
    }

    // Map selections for quick lookup
    const selectionMap = new Map<string, string>();
    for (const sel of employeeSelections) {
      selectionMap.set(sel.employeeId, sel.remarks || "");
    }

    // Filter payslips for selected employees
    const targetPayslips = run.payslips.filter((ps) => selectionMap.has(ps.employeeId));

    if (targetPayslips.length === 0) {
      return NextResponse.json({ error: "No matching employees selected" }, { status: 400 });
    }

    const templatePath = path.join(process.cwd(), "public", "BDO ATM Payroll Converter for BOB -.GPFRESH COMPANY INC.xls");
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: "BDO BOB template spreadsheet not found in public directory" }, { status: 500 });
    }

    // Build standard payload rows
    const rows = targetPayslips.map((ps) => {
      const emp = ps.employee;
      const remarks = selectionMap.get(emp.id) || "";
      const middle = emp.middleName?.trim() ? ` ${emp.middleName.trim()} ` : " ";
      const formattedName = `${emp.firstName.trim()}${middle}${emp.lastName.trim()}`.toUpperCase();
      return {
        account: emp.bankAccountNumber || "",
        amount: Number(ps.netPay),
        name: formattedName,
        remarks,
      };
    });

    let outputBuffer: Buffer | null = null;

    // 2. Attempt Python Excel COM population (preserves ActiveX CommandButton1, macros, and formatting 100%)
    const tempDir = os.tmpdir();
    const jsonPath = path.join(tempDir, `bdo_bob_input_${Date.now()}.json`);
    const outputPath = path.join(tempDir, `bdo_bob_output_${Date.now()}.xls`);

    try {
      const payload = {
        templatePath,
        outputPath,
        uploadDate: uploadDate || new Date().toISOString().slice(0, 10),
        companyCode: companyCode || run.company.companyCode || "C86I",
        batch: String(batch || "1"),
        rows,
      };

      fs.writeFileSync(jsonPath, JSON.stringify(payload), "utf-8");
      const scriptPath = path.join(process.cwd(), "scripts", "populate_bdo_bob.py");
      
      execFileSync("python", [scriptPath, jsonPath], { stdio: "pipe", timeout: 15000 });
      if (fs.existsSync(outputPath)) {
        outputBuffer = fs.readFileSync(outputPath);
      }
    } catch (pyErr) {
      console.warn("Python Excel COM populator unavailable or failed, falling back to SheetJS:", pyErr);
    } finally {
      if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }

    // 3. Fallback to SheetJS if Python COM was unavailable
    if (!outputBuffer) {
      const templateBuffer = fs.readFileSync(templatePath);
      const wb = XLSX.read(templateBuffer, { cellStyles: true, cellFormula: true, bookVBA: true, cellDates: true });
      const sheetName = wb.SheetNames[0] || "Sheet1";
      const sheet = wb.Sheets[sheetName];

      const formattedUploadDate = uploadDate ? new Date(uploadDate) : new Date();
      sheet["B2"] = { v: formattedUploadDate, t: "d", z: "d-mmm-yy" };
      sheet["B3"] = { v: companyCode || run.company.companyCode || "C86I", t: "s" };
      sheet["B5"] = { v: String(batch || "1"), t: "s" };

      rows.forEach((r, idx) => {
        const rowIdx = 7 + idx;
        sheet[`A${rowIdx}`] = { v: r.account, t: "s" };
        sheet[`B${rowIdx}`] = { v: r.amount, t: "n", z: "#,##0.00" };
        sheet[`C${rowIdx}`] = { v: r.name, t: "s" };
        sheet[`D${rowIdx}`] = { v: r.remarks, t: "s" };
      });

      sheet["!ref"] = `A1:D${6 + rows.length}`;
      outputBuffer = XLSX.write(wb, { type: "buffer", bookType: "xls", bookVBA: true });
    }

    if (!outputBuffer) {
      return NextResponse.json({ error: "Failed to generate Excel output" }, { status: 500 });
    }

    // 4. Preserve original filename style (e.g. BDO ATM Payroll Converter for BOB - GPFRESH COMPANY INC.xls)
    const companyNameClean = (run.company.legalName || "COMPANY").replace(/[/\\?%*:|"<>]/g, "");
    const filename = `BDO ATM Payroll Converter for BOB - ${companyNameClean}.xls`;

    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.ms-excel",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (err: any) {
    console.error("Error generating BDO BOB report:", err);
    return NextResponse.json({ error: err.message || "Failed to generate BDO BOB report" }, { status: 500 });
  }
}
