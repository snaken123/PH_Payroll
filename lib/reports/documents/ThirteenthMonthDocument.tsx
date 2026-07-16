import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles, formatMoney } from "./styles";

export interface ThirteenthMonthRow {
  employeeNumber: string;
  name: string;
  basicSalaryEarned: string;
  thirteenthMonthPay: string;
  taxableExcess: string;
}

export interface ThirteenthMonthDocumentData {
  company: { legalName: string; tin: string };
  year: number;
  exemptionCeiling: string;
  rows: ThirteenthMonthRow[];
}

export function ThirteenthMonthDocument({ data }: { data: ThirteenthMonthDocumentData }) {
  const totals = data.rows.reduce(
    (acc, r) => ({
      basic: acc.basic + Number(r.basicSalaryEarned),
      thirteenth: acc.thirteenth + Number(r.thirteenthMonthPay),
    }),
    { basic: 0, thirteenth: 0 }
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBlock}>
          <Text style={styles.title}>13th Month Pay Report</Text>
          <Text style={styles.subtitle}>Presidential Decree 851</Text>
          <Text style={styles.companyLine}>{data.company.legalName}</Text>
          <Text style={styles.companyLine}>TIN: {data.company.tin}</Text>
          <Text style={styles.companyLine}>Calendar year {data.year}</Text>
          <Text style={styles.companyLine}>
            Tax-exempt ceiling (combined with other benefits): ₱{formatMoney(data.exemptionCeiling)}
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={styles.cellHeader}>Employee #</Text>
            <Text style={[styles.cellHeader, { flex: 2 }]}>Name</Text>
            <Text style={styles.cellHeader}>Basic Salary Earned</Text>
            <Text style={styles.cellHeader}>13th Month Pay</Text>
            <Text style={styles.cellHeader}>Taxable Excess</Text>
          </View>
          {data.rows.map((r, i) => (
            <View style={styles.row} key={i}>
              <Text style={styles.cell}>{r.employeeNumber}</Text>
              <Text style={[styles.cell, { flex: 2 }]}>{r.name}</Text>
              <Text style={styles.cellRight}>{formatMoney(r.basicSalaryEarned)}</Text>
              <Text style={styles.cellRight}>{formatMoney(r.thirteenthMonthPay)}</Text>
              <Text style={styles.cellRight}>{formatMoney(r.taxableExcess)}</Text>
            </View>
          ))}
          <View style={styles.totalsRow}>
            <Text style={styles.cell}>TOTAL</Text>
            <Text style={[styles.cell, { flex: 2 }]}></Text>
            <Text style={styles.cellRight}>{formatMoney(totals.basic)}</Text>
            <Text style={styles.cellRight}>{formatMoney(totals.thirteenth)}</Text>
            <Text style={styles.cellRight}></Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Basic salary earned excludes overtime, holiday/rest-day premiums, night differential, and
          allowances, per DOLE 13th month pay rules. Computed from posted payroll runs only. Deadline:
          on or before December 24.
        </Text>
      </Page>
    </Document>
  );
}
