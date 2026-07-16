import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles, formatMoney } from "./styles";

export interface Form2316DocumentData {
  company: { legalName: string; tin: string; rdoCode: string; registeredAddress: string };
  employee: { employeeNumber: string; fullName: string; tin: string };
  year: number;
  totalGrossCompensation: string;
  totalStatutoryContributions: string;
  totalTaxableCompensation: string;
  cumulativeTaxWithheld: string;
  annualTaxDue: string;
  yearEndAdjustment: string;
}

export function Form2316Document({ data }: { data: Form2316DocumentData }) {
  const adjustment = Number(data.yearEndAdjustment);
  const adjustmentLabel = adjustment > 0 ? "Additional tax due from employee" : adjustment < 0 ? "Tax refund due to employee" : "No adjustment — fully settled";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBlock}>
          <Text style={styles.title}>BIR Form 2316</Text>
          <Text style={styles.subtitle}>
            Certificate of Compensation Payment / Tax Withheld For Compensation Payment With or Without
            Tax Withheld
          </Text>
          <Text style={styles.companyLine}>Calendar year {data.year}</Text>
        </View>

        <Text style={styles.sectionTitle}>Employer</Text>
        <View style={styles.kvRow}>
          <Text style={styles.kvLabel}>Name</Text>
          <Text style={styles.kvValue}>{data.company.legalName}</Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvLabel}>TIN</Text>
          <Text style={styles.kvValue}>{data.company.tin}</Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvLabel}>RDO Code</Text>
          <Text style={styles.kvValue}>{data.company.rdoCode}</Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvLabel}>Address</Text>
          <Text style={styles.kvValue}>{data.company.registeredAddress}</Text>
        </View>

        <Text style={styles.sectionTitle}>Employee</Text>
        <View style={styles.kvRow}>
          <Text style={styles.kvLabel}>Name</Text>
          <Text style={styles.kvValue}>{data.employee.fullName}</Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvLabel}>Employee #</Text>
          <Text style={styles.kvValue}>{data.employee.employeeNumber}</Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvLabel}>TIN</Text>
          <Text style={styles.kvValue}>{data.employee.tin || "—"}</Text>
        </View>

        <Text style={styles.sectionTitle}>Annual Compensation &amp; Tax Withheld</Text>
        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={styles.cell}>Total Gross Compensation</Text>
            <Text style={styles.cellRight}>{formatMoney(data.totalGrossCompensation)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cell}>Less: SSS/PhilHealth/Pag-IBIG Employee Contributions</Text>
            <Text style={styles.cellRight}>({formatMoney(data.totalStatutoryContributions)})</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cell}>Net Taxable Compensation</Text>
            <Text style={styles.cellRight}>{formatMoney(data.totalTaxableCompensation)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cell}>Tax Due (per annual table)</Text>
            <Text style={styles.cellRight}>{formatMoney(data.annualTaxDue)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cell}>Tax Withheld (cumulative, per posted cutoffs)</Text>
            <Text style={styles.cellRight}>{formatMoney(data.cumulativeTaxWithheld)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.cell}>{adjustmentLabel}</Text>
            <Text style={styles.cellRight}>{formatMoney(Math.abs(adjustment))}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          SIMPLIFICATION NOTICE: Net Taxable Compensation above excludes only SSS/PhilHealth/Pag-IBIG
          employee-share contributions. It does NOT separately exclude non-taxable (de minimis) allowances
          or apply the ₱90,000 combined 13th-month/other-benefits exemption ceiling — those require
          per-line-item taxability tracking not yet implemented. Verify this figure against manual
          computation before filing. Generated from posted payroll runs only.
        </Text>
      </Page>
    </Document>
  );
}
