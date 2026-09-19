import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { generateCompanyPayoutReport } from "@/lib/reports/companyPayoutReport";
import { pdfResponse } from "@/lib/reports/renderPdf";
import { CompanyPayoutDocument, type CompanyPayoutPdfData } from "@/lib/reports/documents/CompanyPayoutDocument";

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session || session.user.platformRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const selectedRunId = searchParams.get("runId") || "ALL";
  const rawCompanyIds = searchParams.get("companyIds");
  const rawEmployeeIds = searchParams.get("employeeIds");

  let companyIds: string[] | undefined;
  if (rawCompanyIds) {
    companyIds = rawCompanyIds.split(",").map((s) => s.trim()).filter(Boolean);
  }

  let employeeIds: string[] | undefined;
  if (rawEmployeeIds) {
    employeeIds = rawEmployeeIds.split(",").map((s) => s.trim()).filter(Boolean);
  }

  const result = await generateCompanyPayoutReport({
    selectedRunId,
    companyIds,
    employeeIds,
  });

  const pdfData: CompanyPayoutPdfData = {
    generatedAt: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    filterSummary: result.filterSummary,
    groupTotals: result.groupTotals,
    reportData: result.reportData.map((co) => ({
      companyId: co.companyId,
      companyName: co.companyName,
      companyCode: co.companyCode,
      grandTotalNet: co.grandTotalNet,
      totalInternalNet: co.totalInternalNet,
      totalIntercompanyNet: co.totalIntercompanyNet,
      internalPayouts: co.internalPayouts.map((i) => ({
        employeeNumber: i.employeeNumber,
        employeeName: i.employeeName,
        positionTitle: i.positionTitle,
        grossPay: i.grossPay,
        statutoryDeductions: i.statutoryDeductions,
        otherDeductions: i.otherDeductions,
        netPay: i.netPay,
        runLabel: i.runLabel,
      })),
      intercompanyPayouts: co.intercompanyPayouts.map((i) => ({
        employeeNumber: i.employeeNumber,
        employeeName: i.employeeName,
        primaryCompany: i.primaryCompany,
        itemLabel: i.itemLabel,
        grossAmount: i.grossAmount,
        netPay: i.netPay,
        runLabel: i.runLabel,
      })),
    })),
    consolidatedEmployees: result.consolidatedEmployees,
  };

  return pdfResponse(CompanyPayoutDocument({ data: pdfData }), "Company_Payout_Special_Report.pdf");
}
