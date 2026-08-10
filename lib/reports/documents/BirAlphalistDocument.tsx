import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatMoney } from "./styles";
import type { BirAlphalistDocumentData } from "../queries";

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
  table: {
    width: "100%",
    marginTop: 8,
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
  colSeq: { width: "4%" },
  colEmpNo: { width: "8%" },
  colName: { width: "18%" },
  colTin: { width: "10%" },
  colNumber: { width: "10%", textAlign: "right" },
  headerText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
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

export function BirAlphalistDocument({ data }: { data: BirAlphalistDocumentData }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={landscapeStyles.page}>
        <View style={landscapeStyles.headerBlock}>
          <Text style={landscapeStyles.title}>BIR Form 1604-C — Alphabetical List of Employees</Text>
          <Text style={landscapeStyles.subtitle}>
            Annual Alphabetical List of Employees With or Without Tax Withheld
          </Text>
          <Text style={landscapeStyles.companyLine}>
            Employer: {data.company.legalName} | TIN: {data.company.tin} | RDO Code: {data.company.rdoCode}
          </Text>
          <Text style={landscapeStyles.companyLine}>
            Registered Address: {data.company.registeredAddress} | Calendar Year: {data.year}
          </Text>
        </View>

        <View style={landscapeStyles.table}>
          <View style={landscapeStyles.headerRow}>
            <Text style={[landscapeStyles.colSeq, landscapeStyles.headerText]}>#</Text>
            <Text style={[landscapeStyles.colEmpNo, landscapeStyles.headerText]}>Emp ID</Text>
            <Text style={[landscapeStyles.colName, landscapeStyles.headerText]}>Employee Name</Text>
            <Text style={[landscapeStyles.colTin, landscapeStyles.headerText]}>TIN</Text>
            <Text style={[landscapeStyles.colNumber, landscapeStyles.headerText]}>Gross Pay</Text>
            <Text style={[landscapeStyles.colNumber, landscapeStyles.headerText]}>Statutory Exemption</Text>
            <Text style={[landscapeStyles.colNumber, landscapeStyles.headerText]}>Non-Tax Benefits</Text>
            <Text style={[landscapeStyles.colNumber, landscapeStyles.headerText]}>Taxable Comp.</Text>
            <Text style={[landscapeStyles.colNumber, landscapeStyles.headerText]}>Tax Withheld</Text>
            <Text style={[landscapeStyles.colNumber, landscapeStyles.headerText]}>Annual Tax Due</Text>
            <Text style={[landscapeStyles.colNumber, landscapeStyles.headerText]}>Adjustment</Text>
          </View>

          {data.rows.map((row) => (
            <View style={landscapeStyles.row} key={row.seqNo}>
              <Text style={[landscapeStyles.colSeq, landscapeStyles.cellText]}>{row.seqNo}</Text>
              <Text style={[landscapeStyles.colEmpNo, landscapeStyles.cellText]}>{row.employeeNumber}</Text>
              <Text style={[landscapeStyles.colName, landscapeStyles.cellText]}>{row.fullName}</Text>
              <Text style={[landscapeStyles.colTin, landscapeStyles.cellText]}>{row.tin}</Text>
              <Text style={[landscapeStyles.colNumber, landscapeStyles.cellText]}>{formatMoney(row.totalGrossCompensation)}</Text>
              <Text style={[landscapeStyles.colNumber, landscapeStyles.cellText]}>{formatMoney(row.nonTaxableStatutory)}</Text>
              <Text style={[landscapeStyles.colNumber, landscapeStyles.cellText]}>{formatMoney(row.nonTaxableExemptions)}</Text>
              <Text style={[landscapeStyles.colNumber, landscapeStyles.cellText]}>{formatMoney(row.netTaxableCompensation)}</Text>
              <Text style={[landscapeStyles.colNumber, landscapeStyles.cellText]}>{formatMoney(row.cumulativeTaxWithheld)}</Text>
              <Text style={[landscapeStyles.colNumber, landscapeStyles.cellText]}>{formatMoney(row.annualTaxDue)}</Text>
              <Text style={[landscapeStyles.colNumber, landscapeStyles.cellText]}>{formatMoney(row.yearEndAdjustment)}</Text>
            </View>
          ))}

          {/* Totals Summary Row */}
          <View style={landscapeStyles.totalsRow}>
            <Text style={[landscapeStyles.colSeq, landscapeStyles.boldText]}></Text>
            <Text style={[landscapeStyles.colEmpNo, landscapeStyles.boldText]}></Text>
            <Text style={[landscapeStyles.colName, landscapeStyles.boldText]}>TOTALS ({data.rows.length} Employees)</Text>
            <Text style={[landscapeStyles.colTin, landscapeStyles.boldText]}></Text>
            <Text style={[landscapeStyles.colNumber, landscapeStyles.boldText]}>{formatMoney(data.totals.totalGrossCompensation)}</Text>
            <Text style={[landscapeStyles.colNumber, landscapeStyles.boldText]}>—</Text>
            <Text style={[landscapeStyles.colNumber, landscapeStyles.boldText]}>—</Text>
            <Text style={[landscapeStyles.colNumber, landscapeStyles.boldText]}>{formatMoney(data.totals.totalNetTaxableCompensation)}</Text>
            <Text style={[landscapeStyles.colNumber, landscapeStyles.boldText]}>{formatMoney(data.totals.totalCumulativeTaxWithheld)}</Text>
            <Text style={[landscapeStyles.colNumber, landscapeStyles.boldText]}>{formatMoney(data.totals.totalAnnualTaxDue)}</Text>
            <Text style={[landscapeStyles.colNumber, landscapeStyles.boldText]}>{formatMoney(data.totals.totalYearEndAdjustment)}</Text>
          </View>
        </View>

        <Text style={landscapeStyles.footer}>
          Generated by PH Payroll from posted, immutable payroll runs for calendar year {data.year}. Verified per BIR Form 1604-C / NIRC Section 32(B).
        </Text>
      </Page>
    </Document>
  );
}
