import { StyleSheet } from "@react-pdf/renderer";

/**
 * Shared visual style for generated reports. These are clean, complete,
 * correctly-labeled business documents containing every legally required
 * field — NOT pixel-exact reproductions of the official BIR/SSS/PhilHealth/
 * Pag-IBIG form layouts. Cross-check against the actual agency templates
 * (exact field positions matter for some agencies' scannable/OCR forms)
 * before using these for real submission.
 */
export const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  title: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
    color: "#4b5563",
    marginBottom: 10,
  },
  headerBlock: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: "1pt solid #d1d5db",
  },
  companyLine: {
    fontSize: 9,
    color: "#374151",
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginTop: 12,
    marginBottom: 6,
  },
  table: {
    display: "flex",
    flexDirection: "column",
    borderTop: "1pt solid #d1d5db",
    borderLeft: "1pt solid #d1d5db",
  },
  row: {
    flexDirection: "row",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
  },
  cell: {
    flex: 1,
    padding: 4,
    borderRight: "1pt solid #d1d5db",
    borderBottom: "1pt solid #d1d5db",
  },
  cellHeader: {
    flex: 1,
    padding: 4,
    borderRight: "1pt solid #d1d5db",
    borderBottom: "1pt solid #d1d5db",
    fontFamily: "Helvetica-Bold",
  },
  cellRight: {
    flex: 1,
    padding: 4,
    borderRight: "1pt solid #d1d5db",
    borderBottom: "1pt solid #d1d5db",
    textAlign: "right",
  },
  totalsRow: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    fontFamily: "Helvetica-Bold",
  },
  footer: {
    marginTop: 16,
    fontSize: 8,
    color: "#6b7280",
  },
  kvRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  kvLabel: {
    width: 140,
    color: "#4b5563",
  },
  kvValue: {
    fontFamily: "Helvetica-Bold",
  },
});

export function formatMoney(value: number | string): string {
  const num = typeof value === "string" ? Number(value) : value;
  return num.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}
