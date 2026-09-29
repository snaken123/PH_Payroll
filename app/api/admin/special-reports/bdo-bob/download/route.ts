import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import fs from "fs";
import path from "path";
import XLSX from "xlsx";

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

    // 2. Read template .xls file while preserving cell styles & VBA project
    const templatePath = path.join(process.cwd(), "public", "BDO ATM Payroll Converter for BOB -.GPFRESH COMPANY INC.xls");
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: "BDO BOB template spreadsheet not found in public directory" }, { status: 500 });
    }

    const templateBuffer = fs.readFileSync(templatePath);
    const wb = XLSX.read(templateBuffer, { cellStyles: true, cellFormula: true, bookVBA: true, cellDates: true });

    const sheetName = wb.SheetNames[0] || "Sheet1";
    const sheet = wb.Sheets[sheetName];

    // 3. Set Metadata Cells
    // Upload Date (Cell B2)
    const formattedUploadDate = uploadDate ? new Date(uploadDate) : new Date();
    sheet["B2"] = {
      v: formattedUploadDate,
      t: "d",
      z: "d-mmm-yy",
    };

    // Company Code (Cell B3)
    sheet["B3"] = {
      v: companyCode || run.company.companyCode || "C86I",
      t: "s",
    };

    // Batch (Cell B5)
    sheet["B5"] = {
      v: String(batch || "1"),
      t: "s",
    };

    // 4. Populate Employee Data Rows starting at Row 7 (A7, B7, C7, D7)
    targetPayslips.forEach((ps, idx) => {
      const rowIdx = 7 + idx;
      const emp = ps.employee;
      const remarks = selectionMap.get(emp.id) || "";

      // Format Name: "First Name", " ", "Middle Name", " ", "Last Name"
      const middle = emp.middleName?.trim() ? ` ${emp.middleName.trim()} ` : " ";
      const formattedName = `${emp.firstName.trim()}${middle}${emp.lastName.trim()}`.toUpperCase();

      // Account # (Col A)
      sheet[`A${rowIdx}`] = {
        v: emp.bankAccountNumber || "",
        t: "s",
      };

      // Amount (Col B) - Computed Net Pay
      sheet[`B${rowIdx}`] = {
        v: Number(ps.netPay),
        t: "n",
        z: "#,##0.00",
      };

      // Name (Col C)
      sheet[`C${rowIdx}`] = {
        v: formattedName,
        t: "s",
      };

      // Remarks (Col D)
      sheet[`D${rowIdx}`] = {
        v: remarks,
        t: "s",
      };
    });

    // Update sheet reference bounds
    sheet["!ref"] = `A1:D${6 + targetPayslips.length}`;

    // 5. Generate XLS buffer with bookVBA: true
    const outputBuffer = XLSX.write(wb, { type: "buffer", bookType: "xls", bookVBA: true });

    const fileNameDate = uploadDate ? uploadDate.replace(/-/g, "") : new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const safeCompanyCode = (companyCode || "BDO_BOB").replace(/[^a-z0-9]/gi, "_");
    const filename = `BDO_BOB_Converter_${safeCompanyCode}_${fileNameDate}.xls`;

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.ms-excel",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("Error generating BDO BOB report:", err);
    return NextResponse.json({ error: err.message || "Failed to generate BDO BOB report" }, { status: 500 });
  }
}
