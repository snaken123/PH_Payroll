import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToFile } from "@react-pdf/renderer";
import fs from "fs";
import path from "path";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1e293b",
    lineHeight: 1.4,
  },
  headerBox: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#0284c7",
    borderBottomStyle: "solid",
    paddingBottom: 12,
    marginBottom: 16,
  },
  companyName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    letterSpacing: 0.5,
  },
  companySub: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 2,
  },
  docTitleBox: {
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  docTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0369a1",
    textAlign: "center",
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: "#f1f5f9",
    padding: 4,
  },
  paragraph: {
    marginBottom: 6,
    textAlign: "justify",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cbd5e1",
    paddingVertical: 3,
  },
  tableLabel: {
    width: "35%",
    fontFamily: "Helvetica-Bold",
    color: "#475569",
    fontSize: 8.5,
  },
  tableValue: {
    width: "65%",
    color: "#0f172a",
    fontSize: 8.5,
  },
  signatureBox: {
    marginTop: 25,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sigLine: {
    width: "42%",
    borderTopWidth: 1,
    borderTopColor: "#475569",
    paddingTop: 4,
    textAlign: "center",
  },
  sigName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  sigRole: {
    fontSize: 7.5,
    color: "#64748b",
  },
  footerText: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    textAlign: "center",
    fontSize: 7,
    color: "#94a3b8",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 4,
  },
});

function Header({ docRef }: { docRef: string }) {
  return React.createElement(
    View,
    { style: styles.headerBox },
    React.createElement(Text, { style: styles.companyName }, "ACME TECHNOLOGIES PHILIPPINES, INC."),
    React.createElement(
      Text,
      { style: styles.companySub },
      "Unit 1801, Prestige Tower, F. Ortigas Jr. Rd., Ortigas Center, Pasig City, Metro Manila | TIN: 999-888-777-000 | RDO: 039"
    ),
    React.createElement(
      Text,
      { style: [styles.companySub, { marginTop: 4, fontFamily: "Helvetica-Bold" }] },
      `201 Vault File Ref: ${docRef} | Classification: CONFIDENTIAL HR RECORD`
    )
  );
}

function Footer() {
  return React.createElement(
    Text,
    { style: styles.footerText },
    "This document is an official Human Resources record maintained in compliance with the Philippine Labor Code (PD 442) and the Data Privacy Act of 2012 (RA 10173). Generated via Philippine Payroll SaaS Platform."
  );
}

// 1. Employment Contract
function createContractDoc(name: string, empNumber: string, position: string, salary: string) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Header, { docRef: `HR-CON-${empNumber}` }),
      React.createElement(
        View,
        { style: styles.docTitleBox },
        React.createElement(Text, { style: styles.docTitle }, "EMPLOYMENT AGREEMENT (REGULAR STATUS)")
      ),
      React.createElement(
        Text,
        { style: styles.paragraph },
        `This Employment Agreement is entered into by and between ACME TECHNOLOGIES PHILIPPINES, INC., a corporation duly organized and existing under the laws of the Republic of the Philippines, and ${name} ("Employee"), with Employee ID ${empNumber}.`
      ),
      React.createElement(Text, { style: styles.sectionTitle }, "1. APPOINTMENT & SCOPE OF DUTIES"),
      React.createElement(
        Text,
        { style: styles.paragraph },
        `The Company hereby employs the Employee in the position of ${position}. The Employee agrees to devote their full working time, attention, and energies to the performance of duties in accordance with company standards and applicable labor laws.`
      ),
      React.createElement(Text, { style: styles.sectionTitle }, "2. COMPENSATION & DE MINIMIS BENEFITS"),
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableLabel }, "Basic Monthly Salary:"),
        React.createElement(Text, { style: styles.tableValue }, salary)
      ),
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableLabel }, "De Minimis Allowances:"),
        React.createElement(Text, { style: styles.tableValue }, "Rice Subsidy (₱2,000/mo), Laundry Allowance (₱300/mo)")
      ),
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableLabel }, "Pay Schedule:"),
        React.createElement(Text, { style: styles.tableValue }, "Semi-Monthly (every 15th and end of the month)")
      ),
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableLabel }, "Statutory Coverage:"),
        React.createElement(Text, { style: styles.tableValue }, "SSS, PhilHealth, Pag-IBIG Fund, BIR Withholding Tax")
      ),
      React.createElement(Text, { style: styles.sectionTitle }, "3. WORKING HOURS & STATUTORY COMPLIANCE"),
      React.createElement(
        Text,
        { style: styles.paragraph },
        "The regular work schedule shall be 40 to 48 hours per week as defined by company branch operations. Work rendered in excess of 8 hours on a regular day, on rest days, and on legal holidays shall be compensated strictly in accordance with Title I, Book Three of the Labor Code of the Philippines."
      ),
      React.createElement(
        View,
        { style: styles.signatureBox },
        React.createElement(
          View,
          { style: styles.sigLine },
          React.createElement(Text, { style: styles.sigName }, "PATRICIA MARIE BAUTISTA"),
          React.createElement(Text, { style: styles.sigRole }, "Head of Human Resources & People Operations")
        ),
        React.createElement(
          View,
          { style: styles.sigLine },
          React.createElement(Text, { style: styles.sigName }, name.toUpperCase()),
          React.createElement(Text, { style: styles.sigRole }, "Employee Signature / Conforme")
        )
      ),
      React.createElement(Footer, null)
    )
  );
}

// 2. NDA / Confidentiality Agreement
function createNDADoc(name: string, empNumber: string) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Header, { docRef: `HR-NDA-${empNumber}` }),
      React.createElement(
        View,
        { style: styles.docTitleBox },
        React.createElement(Text, { style: styles.docTitle }, "NON-DISCLOSURE & PROPRIETARY INFORMATION AGREEMENT")
      ),
      React.createElement(
        Text,
        { style: styles.paragraph },
        `This Proprietary Information and Inventions Agreement is made between Acme Technologies Philippines, Inc. and ${name} (Employee No. ${empNumber}) as a condition of employment.`
      ),
      React.createElement(Text, { style: styles.sectionTitle }, "1. CONFIDENTIAL INFORMATION"),
      React.createElement(
        Text,
        { style: styles.paragraph },
        "The Employee understands that 'Confidential Information' includes all corporate data, source code, payroll records, customer lists, business strategies, technical designs, and intellectual property not generally known to the public. The Employee covenants to hold all such information in strict confidence."
      ),
      React.createElement(Text, { style: styles.sectionTitle }, "2. WORK FOR HIRE & IP ASSIGNMENT"),
      React.createElement(
        Text,
        { style: styles.paragraph },
        "All discoveries, inventions, computer programs, designs, and works created by the Employee during the term of employment and related to company business shall belong exclusively to Acme Technologies Philippines, Inc. as work-for-hire under the Intellectual Property Code of the Philippines (RA 8293)."
      ),
      React.createElement(Text, { style: styles.sectionTitle }, "3. NON-SOLICITATION & DURATION"),
      React.createElement(
        Text,
        { style: styles.paragraph },
        "For a period of twelve (12) months following separation of employment for any cause, the Employee shall not directly or indirectly induce any company personnel to terminate their employment, nor solicit company clients."
      ),
      React.createElement(
        View,
        { style: styles.signatureBox },
        React.createElement(
          View,
          { style: styles.sigLine },
          React.createElement(Text, { style: styles.sigName }, "RODOLFO SALAZAR"),
          React.createElement(Text, { style: styles.sigRole }, "Chief Executive Officer / Managing Director")
        ),
        React.createElement(
          View,
          { style: styles.sigLine },
          React.createElement(Text, { style: styles.sigName }, name.toUpperCase()),
          React.createElement(Text, { style: styles.sigRole }, "Affiant / Employee")
        )
      ),
      React.createElement(Footer, null)
    )
  );
}

// 3. Government Registration Form (BIR 1902 / SSS / PhilHealth / HDMF)
function createGovtDoc(title: string, agency: string, refNum: string, name: string, tinOrPin: string) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Header, { docRef: `GOV-${agency}-${refNum.slice(-4)}` }),
      React.createElement(
        View,
        { style: styles.docTitleBox },
        React.createElement(Text, { style: styles.docTitle }, title)
      ),
      React.createElement(Text, { style: styles.sectionTitle }, "MEMBER & EMPLOYER STATUTORY IDENTIFIERS"),
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableLabel }, "Registered Member Name:"),
        React.createElement(Text, { style: styles.tableValue }, name)
      ),
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableLabel }, `${agency} ID / Reference No:`),
        React.createElement(Text, { style: [styles.tableValue, { fontFamily: "Helvetica-Bold" }] }, tinOrPin)
      ),
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableLabel }, "Employing Corporation:"),
        React.createElement(Text, { style: styles.tableValue }, "Acme Technologies Philippines, Inc.")
      ),
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableLabel }, "Employer TIN / Reg No:"),
        React.createElement(Text, { style: styles.tableValue }, "999-888-777-000 | RDO 039")
      ),
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableLabel }, "Status of Registration:"),
        React.createElement(Text, { style: styles.tableValue }, "ACTIVE / VERIFIED AND TRANSMITTED")
      ),
      React.createElement(Text, { style: styles.sectionTitle }, "STATUTORY MANDATE & WITHHOLDING COMPLIANCE"),
      React.createElement(
        Text,
        { style: styles.paragraph },
        `This certified statutory transcript confirms that the above-named employee is officially registered under the ${agency} database. Monthly contributions and withholding taxes are automatically deducted, remitted, and reported electronically via the platform's statutory remittance portal in full compliance with Republic Acts 11199, 11223, and 9679.`
      ),
      React.createElement(
        View,
        { style: styles.signatureBox },
        React.createElement(
          View,
          { style: styles.sigLine },
          React.createElement(Text, { style: styles.sigName }, "OLIBER DE LEON"),
          React.createElement(Text, { style: styles.sigRole }, "Payroll & Statutory Compliance Administrator")
        ),
        React.createElement(
          View,
          { style: styles.sigLine },
          React.createElement(Text, { style: styles.sigName }, name.toUpperCase()),
          React.createElement(Text, { style: styles.sigRole }, "Member Signature")
        )
      ),
      React.createElement(Footer, null)
    )
  );
}

// 4. Medical Clearance Certificate
function createMedicalDoc(name: string, empNumber: string) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Header, { docRef: `MED-CLR-${empNumber}` }),
      React.createElement(
        View,
        { style: styles.docTitleBox },
        React.createElement(Text, { style: styles.docTitle }, "ANNUAL MEDICAL HEALTH CLEARANCE & FIT TO WORK CERTIFICATION")
      ),
      React.createElement(
        Text,
        { style: styles.paragraph },
        `This is to certify that ${name} (Employee ID: ${empNumber}) has undergone the comprehensive Annual Physical Examination (APE) and Corporate Occupational Health screening conducted on September 15, 2026.`
      ),
      React.createElement(Text, { style: styles.sectionTitle }, "CLINICAL EXAMINATION FINDINGS"),
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableLabel }, "Chest X-Ray (14x17 PA):"),
        React.createElement(Text, { style: styles.tableValue }, "Normal heart and lung findings. No active parenchymal lesions.")
      ),
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableLabel }, "Complete Blood Count (CBC):"),
        React.createElement(Text, { style: styles.tableValue }, "All parameters (Hb, Hct, WBC, Platelets) within normal reference ranges.")
      ),
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableLabel }, "Routine Urinalysis:"),
        React.createElement(Text, { style: styles.tableValue }, "Clear, pale yellow, protein negative, glucose negative.")
      ),
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableLabel }, "Visual Acuity & Color Vision:"),
        React.createElement(Text, { style: styles.tableValue }, "20/20 corrected with spectacles. Ishihara color test normal.")
      ),
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableLabel }, "Medical Classification:"),
        React.createElement(Text, { style: [styles.tableValue, { fontFamily: "Helvetica-Bold", color: "#16a34a" }] }, "CLASS A — FIT FOR WORK / ALL REGULAR DUTIES")
      ),
      React.createElement(
        View,
        { style: styles.signatureBox },
        React.createElement(
          View,
          { style: styles.sigLine },
          React.createElement(Text, { style: styles.sigName }, "DR. JOSE MARI CARPIO, MD, FPCP"),
          React.createElement(Text, { style: styles.sigRole }, "Corporate Medical Director | PRC License No. 0089201")
        ),
        React.createElement(
          View,
          { style: styles.sigLine },
          React.createElement(Text, { style: styles.sigName }, name.toUpperCase()),
          React.createElement(Text, { style: styles.sigRole }, "Patient / Employee")
        )
      ),
      React.createElement(Footer, null)
    )
  );
}

// 5. Performance Appraisal
function createPerformanceDoc(name: string, empNumber: string, position: string, rating: string) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Header, { docRef: `HR-EVAL-${empNumber}` }),
      React.createElement(
        View,
        { style: styles.docTitleBox },
        React.createElement(Text, { style: styles.docTitle }, "EMPLOYEE PERFORMANCE EVALUATION & APPRAISAL (Q3 2026)")
      ),
      React.createElement(
        Text,
        { style: styles.paragraph },
        `Formal performance evaluation record for ${name}, holding the title of ${position} under Employee Reference ${empNumber}. Evaluation period covering January 1, 2026 to September 30, 2026.`
      ),
      React.createElement(Text, { style: styles.sectionTitle }, "KEY RESULT AREAS (KRA) & COMPETENCIES"),
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableLabel }, "Technical Execution & Quality:"),
        React.createElement(Text, { style: styles.tableValue }, "4.9 / 5.0 — Consistently delivers high-impact, robust deliverables on time.")
      ),
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableLabel }, "Leadership & Collaboration:"),
        React.createElement(Text, { style: styles.tableValue }, "4.8 / 5.0 — Proactive mentorship and positive cross-functional teamwork.")
      ),
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableLabel }, "Attendance & Reliability:"),
        React.createElement(Text, { style: styles.tableValue }, "4.7 / 5.0 — Excellent shift adherence, punctuality, and availability.")
      ),
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableLabel }, "OVERALL PERFORMANCE SCORE:"),
        React.createElement(Text, { style: [styles.tableValue, { fontFamily: "Helvetica-Bold", color: "#0284c7" }] }, `${rating} (OUTSTANDING / EXCEEDS EXPECTATIONS)`)
      ),
      React.createElement(Text, { style: styles.sectionTitle }, "APPRAISER REMARKS & RECOMMENDATION"),
      React.createElement(
        Text,
        { style: styles.paragraph },
        "Employee demonstrated exceptional dedication to organizational growth, high ethical standards, and continuous learning. Recommended for merit salary adjustment and key project leadership in FY2027."
      ),
      React.createElement(
        View,
        { style: styles.signatureBox },
        React.createElement(
          View,
          { style: styles.sigLine },
          React.createElement(Text, { style: styles.sigName }, "PATRICIA MARIE BAUTISTA"),
          React.createElement(Text, { style: styles.sigRole }, "Appraising Officer / People Operations")
        ),
        React.createElement(
          View,
          { style: styles.sigLine },
          React.createElement(Text, { style: styles.sigName }, name.toUpperCase()),
          React.createElement(Text, { style: styles.sigRole }, "Employee Acknowledgement")
        )
      ),
      React.createElement(Footer, null)
    )
  );
}

// 6. Release, Waiver and Quitclaim (for Resigned Employee)
function createQuitclaimDoc(name: string, empNumber: string, finalPayAmount: string) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Header, { docRef: `HR-QTC-${empNumber}` }),
      React.createElement(
        View,
        { style: styles.docTitleBox },
        React.createElement(Text, { style: styles.docTitle }, "CERTIFICATE OF FINAL SETTLEMENT, RELEASE, WAIVER AND QUITCLAIM")
      ),
      React.createElement(
        Text,
        { style: styles.paragraph },
        `KNOW ALL MEN BY THESE PRESENTS: That I, ${name}, of legal age, Filipino, and formerly employed as UI/UX Designer with Employee ID ${empNumber} at Acme Technologies Philippines, Inc., hereby declare and state under oath:`
      ),
      React.createElement(Text, { style: styles.sectionTitle }, "1. RECEIPT OF FINAL PAY AND BENEFITS"),
      React.createElement(
        Text,
        { style: styles.paragraph },
        `That I have received from Acme Technologies Philippines, Inc. the total sum of ${finalPayAmount} (Net Final Pay) via Corporate Disbursement Check, representing full and final payment of all salaries, prorated 13th-month pay, cash conversion of unused leave credits, and all other compensation due to me arising from my employment up to my date of separation on September 30, 2026.`
      ),
      React.createElement(Text, { style: styles.sectionTitle }, "2. CLEARANCE & SURRENDER OF ACCOUNTABILITIES"),
      React.createElement(
        Text,
        { style: styles.paragraph },
        "That I have fully surrendered all company equipment, badges, tokens, access credentials, and files in my possession, and have completed the official Employee Separation Clearance procedure with all concerned departments."
      ),
      React.createElement(Text, { style: styles.sectionTitle }, "3. FULL RELEASE AND WAIVER"),
      React.createElement(
        Text,
        { style: styles.paragraph },
        "That I have no further claims, demands, or causes of action of whatever nature against Acme Technologies Philippines, Inc., its directors, officers, or staff, whether under the Labor Code of the Philippines, civil law, or company policies. I execute this document freely and voluntarily with full comprehension of its legal consequences."
      ),
      React.createElement(
        View,
        { style: styles.signatureBox },
        React.createElement(
          View,
          { style: styles.sigLine },
          React.createElement(Text, { style: styles.sigName }, "RODOLFO SALAZAR"),
          React.createElement(Text, { style: styles.sigRole }, "Employer Representative")
        ),
        React.createElement(
          View,
          { style: styles.sigLine },
          React.createElement(Text, { style: styles.sigName }, name.toUpperCase()),
          React.createElement(Text, { style: styles.sigRole }, "Affiant / Separated Employee")
        )
      ),
      React.createElement(Footer, null)
    )
  );
}

// 7. Attendance Memo
function createAttendanceMemoDoc(name: string, empNumber: string) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Header, { docRef: `HR-MEMO-${empNumber}` }),
      React.createElement(
        View,
        { style: styles.docTitleBox },
        React.createElement(Text, { style: styles.docTitle }, "HUMAN RESOURCES ADVISORY MEMORANDUM: ATTENDANCE & PUNCTUALITY")
      ),
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableLabel }, "TO:"),
        React.createElement(Text, { style: styles.tableValue }, `${name} (${empNumber})`)
      ),
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableLabel }, "FROM:"),
        React.createElement(Text, { style: styles.tableValue }, "People Operations & Attendance Administration")
      ),
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableLabel }, "DATE:"),
        React.createElement(Text, { style: styles.tableValue }, "October 5, 2026")
      ),
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableLabel }, "SUBJECT:"),
        React.createElement(Text, { style: [styles.tableValue, { fontFamily: "Helvetica-Bold" }] }, "Advisory on Shift Punctuality & Grace Period Observance")
      ),
      React.createElement(Text, { style: styles.sectionTitle }, "POLICY RECAP & OBSERVATION"),
      React.createElement(
        Text,
        { style: styles.paragraph },
        "In review of the biometric timesheet records for the recent cutoff, an isolated late arrival was logged on October 3, 2026. Under corporate attendance policies and the Labor Code, punctuality is essential to maintain optimal sprint collaboration."
      ),
      React.createElement(
        Text,
        { style: styles.paragraph },
        "This memo serves as a formal reminder to coordinate shift adjustments in advance with your Lead Architect. No disciplinary action is required at this time; this record is placed in your 201 file for counseling and compliance documentation."
      ),
      React.createElement(
        View,
        { style: styles.signatureBox },
        React.createElement(
          View,
          { style: styles.sigLine },
          React.createElement(Text, { style: styles.sigName }, "PATRICIA MARIE BAUTISTA"),
          React.createElement(Text, { style: styles.sigRole }, "Human Resources Specialist")
        ),
        React.createElement(
          View,
          { style: styles.sigLine },
          React.createElement(Text, { style: styles.sigName }, name.toUpperCase()),
          React.createElement(Text, { style: styles.sigRole }, "Employee Acknowledgement")
        )
      ),
      React.createElement(Footer, null)
    )
  );
}

export async function generateAllDemoDocuments() {
  const targetDir = path.join(process.cwd(), "public", "demo-docs");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const docs = [
    {
      file: "ACM-001_Employment_Contract.pdf",
      doc: createContractDoc("Juan Carlo Mendoza", "ACM-001", "VP of Engineering", "₱150,000.00 / month"),
    },
    {
      file: "ACM-001_NDA_Confidentiality.pdf",
      doc: createNDADoc("Juan Carlo Mendoza", "ACM-001"),
    },
    {
      file: "ACM-001_BIR_Form_1902.pdf",
      doc: createGovtDoc("BIR FORM 1902 — APPLICATION FOR REGISTRATION (COMPENSATION)", "BIR", "1902-8819", "Juan Carlo Mendoza", "234-567-890-000"),
    },
    {
      file: "ACM-002_PhilHealth_MDR.pdf",
      doc: createGovtDoc("PHILHEALTH MEMBER DATA RECORD (MDR)", "PHILHEALTH", "MDR-4901", "Maria Cristina Reyes", "12-345678901-2"),
    },
    {
      file: "ACM-002_SSS_E1_Record.pdf",
      doc: createGovtDoc("SSS FORM E-1 — MEMBER REGISTRATION RECORD", "SSS", "E1-7782", "Maria Cristina Reyes", "03-4567890-1"),
    },
    {
      file: "ACM-003_Pre_Employment_Fit_To_Work.pdf",
      doc: createMedicalDoc("Angelo Gabriel Santos", "ACM-003"),
    },
    {
      file: "ACM-003_Notice_To_Explain_Attendance.pdf",
      doc: createAttendanceMemoDoc("Angelo Gabriel Santos", "ACM-003"),
    },
    {
      file: "ACM-004_Annual_Performance_Appraisal.pdf",
      doc: createPerformanceDoc("Patricia Marie Bautista", "ACM-004", "HR Specialist", "4.8 / 5.0"),
    },
    {
      file: "ACM-006_PagIBIG_MID_Record.pdf",
      doc: createGovtDoc("PAG-IBIG FUND MEMBER IDENTIFICATION (MID) RECORD", "HDMF", "MID-9021", "Rommel Joshua Tan", "1212-3456-7890"),
    },
    {
      file: "ACM-009_Release_Waiver_Quitclaim.pdf",
      doc: createQuitclaimDoc("Karen Joy Soriano", "ACM-009", "₱46,350.00"),
    },
  ];

  for (const item of docs) {
    const dest = path.join(targetDir, item.file);
    await renderToFile(item.doc, dest);
  }

  // Also copy Zeke Med Cert.jpg as a sample Government ID / Medical attachment
  const srcScan = path.join(process.cwd(), "public", "Zeke Med Cert.jpg");
  if (fs.existsSync(srcScan)) {
    fs.copyFileSync(srcScan, path.join(targetDir, "ACM-007_Scanned_UMID_Card.jpg"));
  }

  console.log(`✅ Generated ${docs.length + 1} authentic 201 PDF/JPG documents in public/demo-docs`);
}

if (require.main === module) {
  generateAllDemoDocuments()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
