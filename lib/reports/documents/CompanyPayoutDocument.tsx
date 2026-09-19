import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatMoney } from "./styles";

const pdfStyles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  headerBlock: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    borderBottomStyle: "solid",
    paddingBottom: 8,
  },
  title: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 8,
    color: "#475569",
    marginTop: 2,
  },
  filterBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  filterText: {
    fontSize: 7.5,
    color: "#334155",
    marginBottom: 2,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  kpiTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#64748B",
    textTransform: "uppercase",
  },
  kpiValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    marginTop: 3,
  },
  companyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0F172A",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginTop: 10,
    marginBottom: 4,
  },
  companyTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
  },
  companyBadge: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#38BDF8",
  },
  sectionSubtitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
    marginTop: 6,
    marginBottom: 3,
  },
  table: {
    width: "100%",
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#CBD5E1",
    paddingVertical: 4,
    paddingHorizontal: 3,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E2E8F0",
    paddingVertical: 3,
    paddingHorizontal: 3,
  },
  totalsRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#0F172A",
    paddingVertical: 4,
    paddingHorizontal: 3,
    marginTop: 2,
  },
  colEmpNo: { width: "10%" },
  colName: { width: "22%" },
  colPosition: { width: "18%" },
  colAmount: { width: "12%", textAlign: "right" },
  colRun: { width: "14%", textAlign: "right" },
  headerCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#334155",
  },
  cell: {
    fontSize: 7,
    color: "#1E293B",
  },
  boldCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#0F172A",
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 24,
    right: 24,
    fontSize: 7,
    color: "#94A3B8",
    textAlign: "center",
  },
});

export interface CompanyPayoutPdfData {
  generatedAt: string;
  filterSummary: {
    includedCompanies: string;
    payrollRunLabel: string;
    statusFilterLabel: string;
  };
  groupTotals: {
    totalInternalNet: number;
    totalIntercompanyNet: number;
    grandTotalNet: number;
  };
  reportData: Array<{
    companyId: string;
    companyName: string;
    companyCode: string;
    grandTotalNet: number;
    totalInternalNet: number;
    totalIntercompanyNet: number;
    internalPayouts: Array<{
      employeeNumber: string;
      employeeName: string;
      positionTitle: string;
      grossPay: number;
      statutoryDeductions: number;
      otherDeductions: number;
      netPay: number;
      runLabel: string;
    }>;
    intercompanyPayouts: Array<{
      employeeNumber: string;
      employeeName: string;
      primaryCompany: string;
      itemLabel: string;
      grossAmount: number;
      netPay: number;
      runLabel: string;
    }>;
  }>;
  consolidatedEmployees: Array<{
    employeeId: string;
    employeeNumber: string;
    employeeName: string;
    companyName: string;
    bankName: string;
    bankAccountNumber: string;
    netAmount: number;
  }>;
}

export function CompanyPayoutDocument({ data }: { data: CompanyPayoutPdfData }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={pdfStyles.page}>
        {/* Header Block */}
        <View style={pdfStyles.headerBlock}>
          <Text style={pdfStyles.title}>Company Payout Special Report</Text>
          <Text style={pdfStyles.subtitle}>
            Multi-Tenant Group Payout Analytics · Cross-Company Internal vs Intercompany Allocations
          </Text>
        </View>

        {/* Filter Configuration Box */}
        <View style={pdfStyles.filterBox}>
          <Text style={pdfStyles.filterText}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Included Companies: </Text>
            {data.filterSummary.includedCompanies}
          </Text>
          <Text style={pdfStyles.filterText}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Payroll Run Filter: </Text>
            {data.filterSummary.payrollRunLabel} ({data.filterSummary.statusFilterLabel})
          </Text>
          <Text style={pdfStyles.filterText}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Generated On: </Text>
            {data.generatedAt}
          </Text>
        </View>

        {/* Group KPI Summary Row */}
        <View style={pdfStyles.kpiRow}>
          <View style={pdfStyles.kpiCard}>
            <Text style={pdfStyles.kpiTitle}>Total Group Net Payout</Text>
            <Text style={pdfStyles.kpiValue}>PHP {formatMoney(data.groupTotals.grandTotalNet)}</Text>
          </View>
          <View style={pdfStyles.kpiCard}>
            <Text style={pdfStyles.kpiTitle}>Total Internal Payouts</Text>
            <Text style={pdfStyles.kpiValue}>PHP {formatMoney(data.groupTotals.totalInternalNet)}</Text>
          </View>
          <View style={pdfStyles.kpiCard}>
            <Text style={pdfStyles.kpiTitle}>Total Intercompany Payouts</Text>
            <Text style={pdfStyles.kpiValue}>PHP {formatMoney(data.groupTotals.totalIntercompanyNet)}</Text>
          </View>
          <View style={pdfStyles.kpiCard}>
            <Text style={pdfStyles.kpiTitle}>Included Group Entities</Text>
            <Text style={pdfStyles.kpiValue}>{data.reportData.length} Companies</Text>
          </View>
        </View>

        {/* Company Net Outlay Summary Table */}
        <Text style={pdfStyles.sectionSubtitle}>
          Company Net Outlay Summary ({data.reportData.length} Companies)
        </Text>
        <View style={[pdfStyles.table, { marginBottom: 12 }]} wrap={false}>
          <View style={pdfStyles.headerRow}>
            <Text style={[pdfStyles.headerCell, { width: "40%" }]}>Company Entity</Text>
            <Text style={[pdfStyles.headerCell, { width: "20%", textAlign: "right" }]}>Internal Net Payout</Text>
            <Text style={[pdfStyles.headerCell, { width: "20%", textAlign: "right" }]}>Intercompany Net Payout</Text>
            <Text style={[pdfStyles.headerCell, { width: "20%", textAlign: "right" }]}>Total Net Outlay</Text>
          </View>
          {data.reportData.map((company) => (
            <View key={company.companyId} style={pdfStyles.row}>
              <Text style={[pdfStyles.cell, { width: "40%", fontFamily: "Helvetica-Bold" }]}>
                {company.companyName} ({company.companyCode})
              </Text>
              <Text style={[pdfStyles.cell, { width: "20%", textAlign: "right" }]}>
                PHP {formatMoney(company.totalInternalNet)}
              </Text>
              <Text style={[pdfStyles.cell, { width: "20%", textAlign: "right" }]}>
                PHP {formatMoney(company.totalIntercompanyNet)}
              </Text>
              <Text style={[pdfStyles.cell, { width: "20%", textAlign: "right", fontFamily: "Helvetica-Bold" }]}>
                PHP {formatMoney(company.grandTotalNet)}
              </Text>
            </View>
          ))}
          <View style={pdfStyles.totalsRow}>
            <Text style={[pdfStyles.boldCell, { width: "40%" }]}>Total Group Net Outlay</Text>
            <Text style={[pdfStyles.boldCell, { width: "20%", textAlign: "right" }]}>
              PHP {formatMoney(data.groupTotals.totalInternalNet)}
            </Text>
            <Text style={[pdfStyles.boldCell, { width: "20%", textAlign: "right" }]}>
              PHP {formatMoney(data.groupTotals.totalIntercompanyNet)}
            </Text>
            <Text style={[pdfStyles.boldCell, { width: "20%", textAlign: "right" }]}>
              PHP {formatMoney(data.groupTotals.grandTotalNet)}
            </Text>
          </View>
        </View>

        {/* Company Breakdown List */}
        {data.reportData.map((company) => (
          <View key={company.companyId} wrap={false}>
            <View style={pdfStyles.companyHeader}>
              <Text style={pdfStyles.companyTitle}>
                {company.companyName} ({company.companyCode})
              </Text>
              <Text style={pdfStyles.companyBadge}>
                Grand Total: PHP {formatMoney(company.grandTotalNet)}
              </Text>
            </View>

            {/* Internal Payouts */}
            <Text style={pdfStyles.sectionSubtitle}>
              Internal Payouts ({company.internalPayouts.length} Employees) — Total: PHP {formatMoney(company.totalInternalNet)}
            </Text>
            {company.internalPayouts.length === 0 ? (
              <Text style={[pdfStyles.cell, { color: "#94A3B8", fontStyle: "italic", marginBottom: 4 }]}>
                No internal payouts for this company in the selected run.
              </Text>
            ) : (
              <View style={pdfStyles.table}>
                <View style={pdfStyles.headerRow}>
                  <Text style={[pdfStyles.headerCell, pdfStyles.colEmpNo]}>Emp #</Text>
                  <Text style={[pdfStyles.headerCell, pdfStyles.colName]}>Employee Name</Text>
                  <Text style={[pdfStyles.headerCell, pdfStyles.colPosition]}>Position</Text>
                  <Text style={[pdfStyles.headerCell, pdfStyles.colAmount]}>Gross Pay</Text>
                  <Text style={[pdfStyles.headerCell, pdfStyles.colAmount]}>Stat. Ded.</Text>
                  <Text style={[pdfStyles.headerCell, pdfStyles.colAmount]}>Other Ded.</Text>
                  <Text style={[pdfStyles.headerCell, pdfStyles.colAmount]}>Net Pay</Text>
                  <Text style={[pdfStyles.headerCell, pdfStyles.colRun]}>Payroll Run</Text>
                </View>
                {company.internalPayouts.map((emp, i) => (
                  <View style={pdfStyles.row} key={i}>
                    <Text style={[pdfStyles.cell, pdfStyles.colEmpNo]}>{emp.employeeNumber}</Text>
                    <Text style={[pdfStyles.boldCell, pdfStyles.colName]}>{emp.employeeName}</Text>
                    <Text style={[pdfStyles.cell, pdfStyles.colPosition]}>{emp.positionTitle || "—"}</Text>
                    <Text style={[pdfStyles.cell, pdfStyles.colAmount]}>PHP {formatMoney(emp.grossPay)}</Text>
                    <Text style={[pdfStyles.cell, pdfStyles.colAmount]}>PHP {formatMoney(emp.statutoryDeductions)}</Text>
                    <Text style={[pdfStyles.cell, pdfStyles.colAmount]}>PHP {formatMoney(emp.otherDeductions)}</Text>
                    <Text style={[pdfStyles.boldCell, pdfStyles.colAmount, { color: "#059669" }]}>PHP {formatMoney(emp.netPay)}</Text>
                    <Text style={[pdfStyles.cell, pdfStyles.colRun]}>{emp.runLabel}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Intercompany Payouts */}
            {company.intercompanyPayouts.length > 0 && (
              <>
                <Text style={pdfStyles.sectionSubtitle}>
                  Intercompany Cross-Funded Payouts ({company.intercompanyPayouts.length} Items) — Total: PHP {formatMoney(company.totalIntercompanyNet)}
                </Text>
                <View style={pdfStyles.table}>
                  <View style={pdfStyles.headerRow}>
                    <Text style={[pdfStyles.headerCell, pdfStyles.colEmpNo]}>Emp #</Text>
                    <Text style={[pdfStyles.headerCell, pdfStyles.colName]}>Employee Name</Text>
                    <Text style={[pdfStyles.headerCell, pdfStyles.colPosition]}>Primary Employer</Text>
                    <Text style={[pdfStyles.headerCell, pdfStyles.colPosition]}>Allowance / Item</Text>
                    <Text style={[pdfStyles.headerCell, pdfStyles.colAmount]}>Gross Amount</Text>
                    <Text style={[pdfStyles.headerCell, pdfStyles.colAmount]}>Interco Net</Text>
                    <Text style={[pdfStyles.headerCell, pdfStyles.colRun]}>Payroll Run</Text>
                  </View>
                  {company.intercompanyPayouts.map((emp, i) => (
                    <View style={pdfStyles.row} key={i}>
                      <Text style={[pdfStyles.cell, pdfStyles.colEmpNo]}>{emp.employeeNumber}</Text>
                      <Text style={[pdfStyles.boldCell, pdfStyles.colName]}>{emp.employeeName}</Text>
                      <Text style={[pdfStyles.cell, pdfStyles.colPosition]}>{emp.primaryCompany}</Text>
                      <Text style={[pdfStyles.cell, pdfStyles.colPosition]}>{emp.itemLabel}</Text>
                      <Text style={[pdfStyles.cell, pdfStyles.colAmount]}>PHP {formatMoney(emp.grossAmount)}</Text>
                      <Text style={[pdfStyles.boldCell, pdfStyles.colAmount, { color: "#2563EB" }]}>PHP {formatMoney(emp.netPay)}</Text>
                      <Text style={[pdfStyles.cell, pdfStyles.colRun]}>{emp.runLabel}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        ))}

        {/* Consolidated Group-Wide Employee Payout List */}
        {data.consolidatedEmployees && data.consolidatedEmployees.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <Text style={pdfStyles.sectionSubtitle}>
              Consolidated Employee Payout Summary ({data.consolidatedEmployees.length} Selected Employees)
            </Text>
            <View style={pdfStyles.table}>
              <View style={pdfStyles.headerRow}>
                <Text style={[pdfStyles.headerCell, { width: "12%" }]}>Employee ID</Text>
                <Text style={[pdfStyles.headerCell, { width: "22%" }]}>Name</Text>
                <Text style={[pdfStyles.headerCell, { width: "22%" }]}>Company Name</Text>
                <Text style={[pdfStyles.headerCell, { width: "16%" }]}>Bank Name</Text>
                <Text style={[pdfStyles.headerCell, { width: "16%" }]}>Bank Account Number</Text>
                <Text style={[pdfStyles.headerCell, { width: "12%", textAlign: "right" }]}>Net Amount</Text>
              </View>
              {data.consolidatedEmployees.map((emp) => (
                <View key={emp.employeeId} style={pdfStyles.row} wrap={false}>
                  <Text style={[pdfStyles.cell, { width: "12%" }]}>{emp.employeeNumber}</Text>
                  <Text style={[pdfStyles.boldCell, { width: "22%" }]}>{emp.employeeName}</Text>
                  <Text style={[pdfStyles.cell, { width: "22%" }]}>{emp.companyName}</Text>
                  <Text style={[pdfStyles.cell, { width: "16%" }]}>{emp.bankName}</Text>
                  <Text style={[pdfStyles.cell, { width: "16%" }]}>{emp.bankAccountNumber}</Text>
                  <Text style={[pdfStyles.boldCell, { width: "12%", textAlign: "right", color: "#059669" }]}>
                    PHP {formatMoney(emp.netAmount)}
                  </Text>
                </View>
              ))}
              <View style={pdfStyles.totalsRow} wrap={false}>
                <Text style={[pdfStyles.boldCell, { width: "88%" }]}>
                  Total Consolidated Employee Payout ({data.consolidatedEmployees.length} Employees)
                </Text>
                <Text style={[pdfStyles.boldCell, { width: "12%", textAlign: "right", color: "#059669" }]}>
                  PHP {formatMoney(data.groupTotals.grandTotalNet)}
                </Text>
              </View>
            </View>
          </View>
        )}

        <Text style={pdfStyles.footer}>
          Generated by Google Antigravity PH Payroll · Super Admin Multi-Company Analytics Console
        </Text>
      </Page>
    </Document>
  );
}
