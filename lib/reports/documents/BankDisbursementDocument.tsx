import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatMoney } from "./styles";
import type { BankDisbursementDocumentData } from "../queries";

const landscapeStyles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  headerBlock: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    borderBottomStyle: "solid",
    paddingBottom: 8,
  },
  title: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  subtitle: {
    fontSize: 8,
    color: "#4B5563",
    marginTop: 2,
  },
  companyLine: {
    fontSize: 8,
    color: "#374151",
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginTop: 10,
    marginBottom: 4,
    color: "#1F2937",
  },
  table: {
    width: "100%",
    marginTop: 4,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#D1D5DB",
    borderStyle: "solid",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    borderBottomStyle: "solid",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  totalsRow: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: "#111827",
    borderStyle: "solid",
    paddingVertical: 5,
    paddingHorizontal: 2,
    marginTop: 4,
  },
  colSeq: { width: "5%" },
  colEmpNo: { width: "10%" },
  colName: { width: "22%" },
  colEmpBank: { width: "18%" },
  colEmpAccount: { width: "18%" },
  colCompanyBank: { width: "15%" },
  colAmount: { width: "12%", textAlign: "right" },
  headerText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: "#374151",
  },
  cellText: {
    fontSize: 7.5,
    color: "#1F2937",
  },
  boldText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 24,
    right: 24,
    fontSize: 7,
    color: "#6B7280",
    textAlign: "center",
  },
});

export function BankDisbursementDocument({ data }: { data: BankDisbursementDocumentData }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={landscapeStyles.page}>
        <View style={landscapeStyles.headerBlock}>
          <Text style={landscapeStyles.title}>Bank Payroll Disbursement &amp; Advice Report</Text>
          <Text style={landscapeStyles.subtitle}>
            Payroll Run #{data.runNumber} | Pay Period: {new Date(data.period.cutoffStart).toLocaleDateString()} – {new Date(data.period.cutoffEnd).toLocaleDateString()} | Pay Date: {new Date(data.period.payDate).toLocaleDateString()}
          </Text>
          <Text style={landscapeStyles.companyLine}>
            Employer: {data.company.legalName} | TIN: {data.company.tin} | Address: {data.company.registeredAddress}
          </Text>
        </View>

        {/* Section 1: Bank Payout Summary */}
        <Text style={landscapeStyles.sectionTitle}>1. Company Debit Summary by Payroll Bank Account</Text>
        <View style={landscapeStyles.table}>
          <View style={landscapeStyles.headerRow}>
            <Text style={[{ width: "30%" }, landscapeStyles.headerText]}>Disbursing Bank</Text>
            <Text style={[{ width: "30%" }, landscapeStyles.headerText]}>Company Account Number</Text>
            <Text style={[{ width: "20%", textAlign: "center" }, landscapeStyles.headerText]}>Employee Count</Text>
            <Text style={[{ width: "20%", textAlign: "right" }, landscapeStyles.headerText]}>Total Debit Amount</Text>
          </View>
          {data.bankSummaries.map((b) => (
            <View style={landscapeStyles.row} key={b.bankAccountId}>
              <Text style={[{ width: "30%" }, landscapeStyles.cellText]}>{b.bankName}</Text>
              <Text style={[{ width: "30%" }, landscapeStyles.cellText]}>{b.accountNumber}</Text>
              <Text style={[{ width: "20%", textAlign: "center" }, landscapeStyles.cellText]}>{b.employeeCount}</Text>
              <Text style={[{ width: "20%", textAlign: "right" }, landscapeStyles.cellText]}>{formatMoney(b.totalAmount)}</Text>
            </View>
          ))}
          <View style={landscapeStyles.totalsRow}>
            <Text style={[{ width: "60%" }, landscapeStyles.boldText]}>TOTAL PAYROLL DISBURSEMENT</Text>
            <Text style={[{ width: "20%", textAlign: "center" }, landscapeStyles.boldText]}>{data.totalEmployees}</Text>
            <Text style={[{ width: "20%", textAlign: "right" }, landscapeStyles.boldText]}>{formatMoney(data.totalPayrollAmount)}</Text>
          </View>
        </View>

        {/* Section 2: Detailed Employee Advice List */}
        <Text style={landscapeStyles.sectionTitle}>2. Employee Bank Advice Details</Text>
        <View style={landscapeStyles.table}>
          <View style={landscapeStyles.headerRow}>
            <Text style={[landscapeStyles.colSeq, landscapeStyles.headerText]}>#</Text>
            <Text style={[landscapeStyles.colEmpNo, landscapeStyles.headerText]}>Emp ID</Text>
            <Text style={[landscapeStyles.colName, landscapeStyles.headerText]}>Employee Name</Text>
            <Text style={[landscapeStyles.colEmpBank, landscapeStyles.headerText]}>Receiving Bank</Text>
            <Text style={[landscapeStyles.colEmpAccount, landscapeStyles.headerText]}>Account Number</Text>
            <Text style={[landscapeStyles.colCompanyBank, landscapeStyles.headerText]}>Disbursing Bank</Text>
            <Text style={[landscapeStyles.colAmount, landscapeStyles.headerText]}>Net Payout</Text>
          </View>

          {data.rows.map((row, idx) => (
            <View style={landscapeStyles.row} key={row.employeeId}>
              <Text style={[landscapeStyles.colSeq, landscapeStyles.cellText]}>{idx + 1}</Text>
              <Text style={[landscapeStyles.colEmpNo, landscapeStyles.cellText]}>{row.employeeNumber}</Text>
              <Text style={[landscapeStyles.colName, landscapeStyles.cellText]}>{row.employeeName}</Text>
              <Text style={[landscapeStyles.colEmpBank, landscapeStyles.cellText]}>{row.bankName}</Text>
              <Text style={[landscapeStyles.colEmpAccount, landscapeStyles.cellText]}>{row.accountNumber}</Text>
              <Text style={[landscapeStyles.colCompanyBank, landscapeStyles.cellText]}>{row.disbursingBankName}</Text>
              <Text style={[landscapeStyles.colAmount, landscapeStyles.cellText]}>{formatMoney(row.netPay)}</Text>
            </View>
          ))}
        </View>

        <Text style={landscapeStyles.footer}>
          Official Bank Payroll Disbursement Advice generated by PH Payroll. Verified against posted payroll run #{data.runNumber}.
        </Text>
      </Page>
    </Document>
  );
}
