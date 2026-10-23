import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  EmployeeDocumentCategory,
  LeaveRequestStatus,
  FinalPayRunStatus,
  SeparationCategory,
  FinalPayLineItemCategory,
  LineItemDirection,
  PeriodType,
  TimesheetStatus,
  StatutoryAgency,
  StatutoryPaymentStatus,
  RemittancePaymentMethod,
} from "../lib/generated/prisma/enums";
import { computeAndPersistPayrollRun } from "../lib/services/payrollRunService";
import { generateAllDemoAvatars } from "../scripts/generate-demo-avatars";
import { generateAllDemoDocuments } from "../scripts/generate-demo-documents";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function seedDemoProcesses() {
  console.log("🚀 Starting Demo Assets & Processes Seeding...");

  // 1. Ensure local asset files are generated
  generateAllDemoAvatars();
  await generateAllDemoDocuments();

  // 2. Fetch demo company
  const company = await prisma.company.findUnique({
    where: { companyCode: "acme-demo" },
    include: {
      employees: true,
      bankAccounts: true,
      leaveTypes: true,
    },
  });

  if (!company) {
    throw new Error("Demo company 'acme-demo' not found! Run npm run db:seed:demo first.");
  }

  const primaryBank = company.bankAccounts[0];
  const adminUser = await prisma.user.findFirst({
    where: { platformRole: "SUPER_ADMIN" },
  });
  const adminUserId = adminUser?.id || "admin-system";
  const adminUserName = adminUser?.name || "System Admin";

  const empMap = new Map(company.employees.map((e) => [e.employeeNumber, e]));

  // 3. Update Avatars (photoUrl) on all employees
  console.log("📸 Assigning custom photo avatars to employee profiles...");
  for (const emp of company.employees) {
    const avatarFile = `${emp.employeeNumber.toLowerCase()}.svg`;
    await prisma.employee.update({
      where: { id: emp.id },
      data: {
        photoUrl: `/demo-avatars/${avatarFile}`,
      },
    });
  }
  console.log("✅ Assigned avatars to all 10 employees");

  // 4. Seed 201 Digital Document Vault Records
  console.log("📁 Seeding 201 Digital Document Vault files...");
  const documentsToSeed = [
    {
      empNum: "ACM-001",
      title: "Signed Regular Employment Contract (VP of Engineering)",
      category: EmployeeDocumentCategory.LEGAL_CONTRACT,
      description: "Executive employment agreement with standard intellectual property & de minimis provisions.",
      fileUrl: "/demo-docs/ACM-001_Employment_Contract.pdf",
      fileName: "ACM-001_Employment_Contract.pdf",
      fileSize: 5639,
      mimeType: "application/pdf",
      documentDate: new Date("2024-01-15"),
    },
    {
      empNum: "ACM-001",
      title: "Non-Disclosure & Proprietary Information Agreement (NDA)",
      category: EmployeeDocumentCategory.LEGAL_CONTRACT,
      description: "Signed corporate confidentiality agreement covering software IP and company assets.",
      fileUrl: "/demo-docs/ACM-001_NDA_Confidentiality.pdf",
      fileName: "ACM-001_NDA_Confidentiality.pdf",
      fileSize: 5137,
      mimeType: "application/pdf",
      documentDate: new Date("2024-01-15"),
    },
    {
      empNum: "ACM-001",
      title: "BIR Form 1902 - Certificate of Tax Registration",
      category: EmployeeDocumentCategory.GOVERNMENT_IDENT,
      description: "Official Bureau of Internal Revenue tax record for compensation income earner.",
      fileUrl: "/demo-docs/ACM-001_BIR_Form_1902.pdf",
      fileName: "ACM-001_BIR_Form_1902.pdf",
      fileSize: 4966,
      mimeType: "application/pdf",
      documentDate: new Date("2024-01-20"),
    },
    {
      empNum: "ACM-002",
      title: "PhilHealth Member Data Record (MDR)",
      category: EmployeeDocumentCategory.GOVERNMENT_IDENT,
      description: "Certified PhilHealth registration slip for Lead Solutions Architect.",
      fileUrl: "/demo-docs/ACM-002_PhilHealth_MDR.pdf",
      fileName: "ACM-002_PhilHealth_MDR.pdf",
      fileSize: 4969,
      mimeType: "application/pdf",
      documentDate: new Date("2024-03-05"),
    },
    {
      empNum: "ACM-002",
      title: "SSS Form E-1 Online Member Registration Slip",
      category: EmployeeDocumentCategory.GOVERNMENT_IDENT,
      description: "Social Security System static information sheet and verified member ID.",
      fileUrl: "/demo-docs/ACM-002_SSS_E1_Record.pdf",
      fileName: "ACM-002_SSS_E1_Record.pdf",
      fileSize: 4946,
      mimeType: "application/pdf",
      documentDate: new Date("2024-03-05"),
    },
    {
      empNum: "ACM-003",
      title: "Annual Medical Health Clearance (Fit to Work)",
      category: EmployeeDocumentCategory.MEDICAL_CLEARANCE,
      description: "Annual physical exam certificate and Class A occupational health clearance.",
      fileUrl: "/demo-docs/ACM-003_Pre_Employment_Fit_To_Work.pdf",
      fileName: "ACM-003_Pre_Employment_Fit_To_Work.pdf",
      fileSize: 4970,
      mimeType: "application/pdf",
      documentDate: new Date("2026-09-15"),
    },
    {
      empNum: "ACM-003",
      title: "HR Advisory Memo: Shift Punctuality & Grace Period Review",
      category: EmployeeDocumentCategory.ATTENDANCE_MEMO,
      description: "Punctuality advisory note regarding Q3 shift attendance log.",
      fileUrl: "/demo-docs/ACM-003_Notice_To_Explain_Attendance.pdf",
      fileName: "ACM-003_Notice_To_Explain_Attendance.pdf",
      fileSize: 4966,
      mimeType: "application/pdf",
      documentDate: new Date("2026-10-05"),
    },
    {
      empNum: "ACM-004",
      title: "Q3 2026 Annual Employee Performance Appraisal",
      category: EmployeeDocumentCategory.COACHING_PERFORMANCE,
      description: "Outstanding 4.8 / 5.0 score for People Operations leadership and Philippine compliance.",
      fileUrl: "/demo-docs/ACM-004_Annual_Performance_Appraisal.pdf",
      fileName: "ACM-004_Annual_Performance_Appraisal.pdf",
      fileSize: 5242,
      mimeType: "application/pdf",
      documentDate: new Date("2026-09-30"),
    },
    {
      empNum: "ACM-006",
      title: "Pag-IBIG Fund Member Identification (MID) Confirmation",
      category: EmployeeDocumentCategory.GOVERNMENT_IDENT,
      description: "HDMF electronic registration printout and remittance identifier.",
      fileUrl: "/demo-docs/ACM-006_PagIBIG_MID_Record.pdf",
      fileName: "ACM-006_PagIBIG_MID_Record.pdf",
      fileSize: 4958,
      mimeType: "application/pdf",
      documentDate: new Date("2024-11-10"),
    },
    {
      empNum: "ACM-007",
      title: "Scanned Unified Multi-Purpose ID (UMID Card)",
      category: EmployeeDocumentCategory.GOVERNMENT_IDENT,
      description: "High-resolution scanned image of verified Philippine government national ID card.",
      fileUrl: "/demo-docs/ACM-007_Scanned_UMID_Card.jpg",
      fileName: "ACM-007_Scanned_UMID_Card.jpg",
      fileSize: 216064,
      mimeType: "image/jpeg",
      documentDate: new Date("2025-02-12"),
    },
    {
      empNum: "ACM-009",
      title: "Certificate of Final Settlement, Release, Waiver & Quitclaim",
      category: EmployeeDocumentCategory.WAIVER,
      description: "Notarized release and quitclaim form signed upon final pay check disbursement.",
      fileUrl: "/demo-docs/ACM-009_Release_Waiver_Quitclaim.pdf",
      fileName: "ACM-009_Release_Waiver_Quitclaim.pdf",
      fileSize: 5504,
      mimeType: "application/pdf",
      documentDate: new Date("2026-10-05"),
    },
  ];

  for (const doc of documentsToSeed) {
    const emp = empMap.get(doc.empNum);
    if (!emp) continue;

    const existingDoc = await prisma.employeeDocument.findFirst({
      where: {
        employeeId: emp.id,
        fileName: doc.fileName,
      },
    });

    if (!existingDoc) {
      await prisma.employeeDocument.create({
        data: {
          companyId: company.id,
          employeeId: emp.id,
          title: doc.title,
          category: doc.category,
          description: doc.description,
          fileUrl: doc.fileUrl,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          documentDate: doc.documentDate,
          uploadedById: adminUserId,
          uploadedByName: "Patricia Bautista (HR)",
        },
      });
    }
  }
  console.log("✅ Seeded 11 authentic 201 documents across employee vaults");

  // 5. Seed Leave Requests
  console.log("🏖️  Seeding employee leave requests (SIL, Vacation, Sick)...");
  const leaveTypesMap = new Map(company.leaveTypes.map((lt) => [lt.code, lt]));
  const silType = leaveTypesMap.get("SIL");
  const vlType = leaveTypesMap.get("VL");
  const slType = leaveTypesMap.get("SL");

  const leaveRequestsToSeed = [
    {
      empNum: "ACM-002",
      type: slType,
      start: new Date("2026-10-06"),
      end: new Date("2026-10-06"),
      days: 1.0,
      status: LeaveRequestStatus.APPROVED,
      reason: "Acute bronchitis, doctor-advised rest with medical certificate.",
    },
    {
      empNum: "ACM-003",
      type: vlType,
      start: new Date("2026-11-04"),
      end: new Date("2026-11-06"),
      days: 3.0,
      status: LeaveRequestStatus.PENDING,
      reason: "Annual family vacation out of town (filed 2 weeks in advance).",
    },
    {
      empNum: "ACM-004",
      type: silType,
      start: new Date("2026-09-18"),
      end: new Date("2026-09-18"),
      days: 1.0,
      status: LeaveRequestStatus.APPROVED,
      reason: "Personal statutory renewal with BIR RDO office.",
    },
    {
      empNum: "ACM-005",
      type: vlType,
      start: new Date("2026-10-28"),
      end: new Date("2026-10-29"),
      days: 2.0,
      status: LeaveRequestStatus.PENDING,
      reason: "Rest and family gathering in Cebu hometown.",
    },
    {
      empNum: "ACM-006",
      type: slType,
      start: new Date("2026-10-12"),
      end: new Date("2026-10-12"),
      days: 1.0,
      status: LeaveRequestStatus.APPROVED,
      reason: "Dental surgery recovery.",
    },
    {
      empNum: "ACM-007",
      type: silType,
      start: new Date("2026-10-09"),
      end: new Date("2026-10-09"),
      days: 1.0,
      status: LeaveRequestStatus.APPROVED,
      reason: "Official government document renewal.",
    },
  ];

  for (const lr of leaveRequestsToSeed) {
    if (!lr.type) continue;
    const emp = empMap.get(lr.empNum);
    if (!emp) continue;

    const existingReq = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: emp.id,
        startDate: lr.start,
        leaveTypeId: lr.type.id,
      },
    });

    if (!existingReq) {
      await prisma.leaveRequest.create({
        data: {
          employeeId: emp.id,
          leaveTypeId: lr.type.id,
          startDate: lr.start,
          endDate: lr.end,
          daysCount: lr.days,
          status: lr.status,
          reason: lr.reason,
          approvedByUserId: lr.status === LeaveRequestStatus.APPROVED ? adminUserId : null,
          approvedAt: lr.status === LeaveRequestStatus.APPROVED ? new Date("2026-10-01") : null,
        },
      });
    }
  }
  console.log("✅ Seeded employee leave requests (both APPROVED and PENDING for live approval demo)");

  // 6. Seed Final Pay Run for Karen Joy Soriano (ACM-009)
  console.log("💼 Seeding Final Pay Run for resigned employee Karen Joy Soriano...");
  const emp9 = empMap.get("ACM-009");
  if (emp9) {
    const existingFinalPay = await prisma.finalPayRun.findFirst({
      where: { companyId: company.id, employeeId: emp9.id },
    });

    if (!existingFinalPay) {
      const finalPay = await prisma.finalPayRun.create({
        data: {
          companyId: company.id,
          employeeId: emp9.id,
          finalPayNumber: 1,
          status: FinalPayRunStatus.POSTED,
          separationDate: new Date("2026-09-30"),
          separationCategory: SeparationCategory.RESIGNATION,
          grossFinalPay: 48500.0,
          totalDeductions: 2150.0,
          netFinalPay: 46350.0,
          computedAt: new Date("2026-10-02"),
          computedByUserId: adminUserId,
          approvedAt: new Date("2026-10-04"),
          approvedByUserId: adminUserId,
          postedAt: new Date("2026-10-05"),
          postedByUserId: adminUserId,
          lineItems: {
            create: [
              {
                category: FinalPayLineItemCategory.PRORATED_THIRTEENTH_MONTH,
                direction: LineItemDirection.EARNING,
                description: "Prorated 13th Month Pay (Jan 1 – Sep 30, 2026: 9/12 of ₱52,000)",
                amount: 39000.0,
                isTaxExempt: true,
              },
              {
                category: FinalPayLineItemCategory.LEAVE_CASHOUT,
                direction: LineItemDirection.EARNING,
                description: "Cash Conversion of Unused Service Incentive Leave (5 days @ ₱1,900.00/day)",
                amount: 9500.0,
                isTaxExempt: false,
              },
              {
                category: FinalPayLineItemCategory.WITHHOLDING_TAX_ADJUSTMENT,
                direction: LineItemDirection.DEDUCTION,
                description: "Annualization Withholding Tax Adjustment",
                amount: 2150.0,
                isTaxExempt: false,
              },
            ],
          },
        },
      });

      // Issue Check for Final Pay
      if (primaryBank) {
        await prisma.payrollPaymentCheck.create({
          data: {
            companyId: company.id,
            finalPayRunId: finalPay.id,
            sourceType: "SEPARATION_PAY",
            checkNumber: "CHK-FP-2026-0001",
            checkDate: new Date("2026-10-05"),
            amount: 46350.0,
            bankAccountId: primaryBank.id,
            bankName: primaryBank.bankName,
            payee: "Karen Joy Soriano (Final Settlement)",
            notes: "Complete separation pay, prorated 13th month, and SIL leave cashout check.",
            status: "ISSUED",
            issuedByUserId: adminUserId,
          },
        });
      }

      // Mark clearance completed on employee
      await prisma.employee.update({
        where: { id: emp9.id },
        data: { clearanceCompleted: true },
      });

      console.log("✅ Seeded Final Pay Run #1 (Net: ₱46,350.00) with line items, check CHK-FP-2026-0001, and cleared status");
    }
  }

  // 7. Seed September 2026 Statutory Remittance Checks
  console.log("🏛️  Seeding September 2026 Statutory Remittance Payment Records...");
  let sssRecord = await prisma.statutoryPaymentRecord.findFirst({
    where: {
      companyId: company.id,
      agency: StatutoryAgency.SSS,
      periodYear: 2026,
      periodMonth: 9,
    },
  });

  if (!sssRecord) {
    sssRecord = await prisma.statutoryPaymentRecord.create({
      data: {
        companyId: company.id,
        agency: StatutoryAgency.SSS,
        periodYear: 2026,
        periodMonth: 9,
        computedEeAmount: 9500.0,
        computedErAmount: 19000.0,
        computedTotalAmount: 28500.0,
        status: StatutoryPaymentStatus.PAID,
        paidAmount: 28500.0,
        paymentDate: new Date("2026-10-10"),
        paymentMethod: RemittancePaymentMethod.CHECK,
        checkNumber: "CHK-SSS-2026-09",
        referenceNumber: "SSS-PRN-202609-88129",
        bankAccountId: primaryBank?.id,
        bankName: primaryBank?.bankName,
        notes: "September 2026 SSS regular & MPF monthly contribution remittance.",
        taggedByUserId: adminUserId,
        taggedAt: new Date("2026-10-10"),
      },
    });
  }

  let philhealthRecord = await prisma.statutoryPaymentRecord.findFirst({
    where: {
      companyId: company.id,
      agency: StatutoryAgency.PHILHEALTH,
      periodYear: 2026,
      periodMonth: 9,
    },
  });

  if (!philhealthRecord) {
    philhealthRecord = await prisma.statutoryPaymentRecord.create({
      data: {
        companyId: company.id,
        agency: StatutoryAgency.PHILHEALTH,
        periodYear: 2026,
        periodMonth: 9,
        computedEeAmount: 7650.0,
        computedErAmount: 7650.0,
        computedTotalAmount: 15300.0,
        status: StatutoryPaymentStatus.PAID,
        paidAmount: 15300.0,
        paymentDate: new Date("2026-10-10"),
        paymentMethod: RemittancePaymentMethod.CHECK,
        checkNumber: "CHK-PH-2026-09",
        referenceNumber: "PHIC-SPA-202609-1092",
        bankAccountId: primaryBank?.id,
        bankName: primaryBank?.bankName,
        notes: "September 2026 PhilHealth monthly premium remittance.",
        taggedByUserId: adminUserId,
        taggedAt: new Date("2026-10-10"),
      },
    });
  }

  if (primaryBank) {
    // SSS Check in register
    await prisma.payrollPaymentCheck.upsert({
      where: { id: "chk-sss-sep2026" },
      update: {},
      create: {
        id: "chk-sss-sep2026",
        companyId: company.id,
        sourceType: "STATUTORY_REMITTANCE",
        statutoryPaymentRecordId: sssRecord.id,
        checkNumber: "CHK-SSS-2026-09",
        checkDate: new Date("2026-10-10"),
        amount: 28500.0,
        bankAccountId: primaryBank.id,
        bankName: primaryBank.bankName,
        payee: "Social Security System (SSS Electronic Remittance)",
        notes: "September 2026 employer and employee monthly contribution payment.",
        status: "ISSUED",
        issuedByUserId: adminUserId,
      },
    });

    // PhilHealth Check in register
    await prisma.payrollPaymentCheck.upsert({
      where: { id: "chk-phic-sep2026" },
      update: {},
      create: {
        id: "chk-phic-sep2026",
        companyId: company.id,
        sourceType: "STATUTORY_REMITTANCE",
        statutoryPaymentRecordId: philhealthRecord.id,
        checkNumber: "CHK-PH-2026-09",
        checkDate: new Date("2026-10-10"),
        amount: 15300.0,
        bankAccountId: primaryBank.id,
        bankName: primaryBank.bankName,
        payee: "Philippine Health Insurance Corporation (PhilHealth)",
        notes: "September 2026 PhilHealth monthly premium contribution payment.",
        status: "ISSUED",
        issuedByUserId: adminUserId,
      },
    });
  }
  console.log("✅ Seeded September 2026 SSS & PhilHealth statutory remittance payments with checks");

  // 8. Seed Oct 16 - 31, 2026 Timesheets & Payroll Run #2 (Cutoff 2: APPROVED / Ready for Demo Posting)
  console.log("⚙️  Seeding Cutoff #2 (Oct 16 – 31, 2026) attendance timesheets & payroll run...");
  const activeEmployees = company.employees.filter(
    (e) => e.employmentStatus !== "RESIGNED"
  );

  for (const emp of activeEmployees) {
    for (let day = 16; day <= 31; day++) {
      const dateStr = `2026-10-${String(day).padStart(2, "0")}`;
      const d = new Date(`${dateStr}T00:00:00.000Z`);
      const dayOfWeek = d.getUTCDay();

      if (dayOfWeek === 0) continue; // Sunday rest day
      const isSaturday = dayOfWeek === 6;

      await prisma.timesheetEntry.upsert({
        where: {
          employeeId_workDate: {
            employeeId: emp.id,
            workDate: d,
          },
        },
        update: {},
        create: {
          companyId: company.id,
          employeeId: emp.id,
          workDate: d,
          timeIn: isSaturday
            ? new Date(`${dateStr}T08:30:00.000Z`)
            : new Date(`${dateStr}T09:00:00.000Z`),
          timeOut: isSaturday
            ? new Date(`${dateStr}T13:30:00.000Z`)
            : new Date(`${dateStr}T18:00:00.000Z`),
          regularHours: isSaturday ? 5 : 8,
          overtimeHours: emp.employeeNumber === "ACM-002" && day === 24 ? 3.0 : 0,
          nightDiffHours: emp.employeeNumber === "ACM-005" ? 2.0 : 0,
          lateMinutes: 0,
          status: TimesheetStatus.PRESENT,
        },
      });
    }
  }

  const existingRun2 = await prisma.payrollRun.findFirst({
    where: { companyId: company.id, runNumber: 2 },
  });

  if (!existingRun2) {
    const run2Id = await computeAndPersistPayrollRun({
      companyId: company.id,
      cutoffStart: new Date("2026-10-16"),
      cutoffEnd: new Date("2026-10-31"),
      payDate: new Date("2026-11-05"),
      periodType: PeriodType.SECOND_HALF,
      computedByUserId: adminUserId,
    });

    // Set to APPROVED (so demonstrator can show the live "Post Payroll" button)
    await prisma.payrollRun.update({
      where: { id: run2Id },
      data: {
        status: "APPROVED",
        approvedAt: new Date("2026-11-01"),
        approvedByUserId: adminUserId,
      },
    });

    console.log("✅ Computed Cutoff #2 (Oct 16 – 31, 2026) with statutory deductions and set to APPROVED (ready to Post!)");
  } else {
    console.log("ℹ️  Payroll Run #2 already exists.");
  }

  console.log("\n🎉 ALL DEMO ASSETS & PROCESSES SUCCESSFULLY SEEDED!");
}

seedDemoProcesses()
  .catch((e) => {
    console.error("❌ Process seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
