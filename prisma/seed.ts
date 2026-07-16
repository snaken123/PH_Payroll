import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import {
  CompanyRole,
  CompanyStatus,
  DeMinimisCategory,
  DeMinimisFrequency,
  PayPeriodType,
  PlatformRole,
  WageSector,
} from "../lib/generated/prisma/enums";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * SSS's own compensation-range-to-MSC PDF table is a scanned image and
 * could not be transcribed from a primary source in this session. The
 * rate/split/floor/ceiling/MPF-threshold/EC-threshold parameters below ARE
 * confirmed against multiple corroborating sources (SSS Circular 2024-006,
 * effective Jan 2025, unchanged for 2026). Bracket rows are generated
 * programmatically from those confirmed parameters in ₱500 MSC increments,
 * with each bracket centered on its MSC value (±₱250) per SSS's historical
 * table structure. VERIFY the exact compensation-range boundaries against
 * the official SSS circular before this seed is used for real payroll.
 */
function generateSssBrackets(effectiveFrom: Date, sourceReference: string) {
  const brackets: {
    effectiveFrom: Date;
    mscFloor: number;
    mscCeiling: number;
    msc: number;
    eeShare: number;
    erShare: number;
    mpfEeShare: number;
    mpfErShare: number;
    ecAmount: number;
    sourceReference: string;
  }[] = [];

  const MSC_MIN = 5000;
  const MSC_MAX = 35000;
  const MPF_THRESHOLD = 20000;
  const EC_THRESHOLD = 15000;
  const STEP = 500;

  for (let msc = MSC_MIN; msc <= MSC_MAX; msc += STEP) {
    const regularMsc = Math.min(msc, MPF_THRESHOLD);
    const mpfMsc = Math.max(msc - MPF_THRESHOLD, 0);

    const mscFloor = msc === MSC_MIN ? 0 : msc - STEP / 2 + 1;
    const mscCeiling = msc === MSC_MAX ? 999999999 : msc + STEP / 2;

    brackets.push({
      effectiveFrom,
      mscFloor,
      mscCeiling,
      msc,
      eeShare: round2(regularMsc * 0.05),
      erShare: round2(regularMsc * 0.1),
      mpfEeShare: round2(mpfMsc * 0.05),
      mpfErShare: round2(mpfMsc * 0.1),
      ecAmount: msc < EC_THRESHOLD ? 10 : 30,
      sourceReference,
    });
  }

  return brackets;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

async function main() {
  // ---------- Platform super-admin ----------
  const superAdminPassword = await bcrypt.hash("ChangeMe123!", 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@ph-payroll.local" },
    update: {},
    create: {
      email: "admin@ph-payroll.local",
      password: superAdminPassword,
      name: "Platform Super Admin",
      platformRole: PlatformRole.SUPER_ADMIN,
    },
  });
  console.log(`Seeded super admin: ${superAdmin.email} (password: ChangeMe123!)`);

  // ---------- Statutory rate tables (July 2026) ----------

  const sssSource =
    "SSS Circular 2024-006 (effective Jan 2025, unchanged 2026) — rate/split/thresholds confirmed; " +
    "bracket boundaries generated programmatically, VERIFY against official circular before production use";
  await prisma.sssContributionBracket.deleteMany({});
  await prisma.sssContributionBracket.createMany({
    data: generateSssBrackets(new Date("2025-01-01"), sssSource),
  });
  console.log("Seeded SSS contribution brackets");

  await prisma.philhealthConfig.upsert({
    where: { id: "philhealth-2026" },
    update: {},
    create: {
      id: "philhealth-2026",
      effectiveFrom: new Date("2024-01-01"),
      premiumRate: 0.05,
      eeShareRate: 0.025,
      erShareRate: 0.025,
      floorSalary: 10000,
      ceilingSalary: 100000,
      sourceReference:
        "PhilHealth Circular PC2026-0001 — final rate under RA 11223 (UHC Law), confirmed unchanged for 2026",
    },
  });
  console.log("Seeded PhilHealth config");

  await prisma.pagibigContributionBracket.upsert({
    where: { id: "pagibig-2026" },
    update: {},
    create: {
      id: "pagibig-2026",
      effectiveFrom: new Date("2024-02-01"),
      salaryThreshold: 1500,
      eeRateBelowThreshold: 0.01,
      erRateBelowThreshold: 0.02,
      eeRateAboveThreshold: 0.02,
      erRateAboveThreshold: 0.02,
      maxFundSalary: 10000,
      eeCap: 200,
      erCap: 200,
      sourceReference: "HDMF Circular No. 460 — Maximum Fund Salary raised to PHP 10,000, effective Feb 2024",
    },
  });
  console.log("Seeded Pag-IBIG contribution bracket");

  const birSource =
    "BIR RR 11-2018 Annex E, as amended (TRAIN law brackets effective Jan 1 2023 onward, unchanged for 2026)";
  await prisma.birWithholdingBracket.deleteMany({});
  await prisma.birWithholdingBracket.createMany({
    data: [
      // Semi-monthly (primary — this product supports semi-monthly pay only)
      { effectiveFrom: new Date("2023-01-01"), payPeriodType: PayPeriodType.SEMI_MONTHLY, bracketFloor: 0, bracketCeiling: 10416, baseTax: 0, excessRate: 0, sourceReference: birSource },
      { effectiveFrom: new Date("2023-01-01"), payPeriodType: PayPeriodType.SEMI_MONTHLY, bracketFloor: 10417, bracketCeiling: 16666, baseTax: 0, excessRate: 0.15, sourceReference: birSource },
      { effectiveFrom: new Date("2023-01-01"), payPeriodType: PayPeriodType.SEMI_MONTHLY, bracketFloor: 16667, bracketCeiling: 33332, baseTax: 937.5, excessRate: 0.2, sourceReference: birSource },
      { effectiveFrom: new Date("2023-01-01"), payPeriodType: PayPeriodType.SEMI_MONTHLY, bracketFloor: 33333, bracketCeiling: 83332, baseTax: 4270.7, excessRate: 0.25, sourceReference: birSource },
      { effectiveFrom: new Date("2023-01-01"), payPeriodType: PayPeriodType.SEMI_MONTHLY, bracketFloor: 83333, bracketCeiling: 333332, baseTax: 16770.7, excessRate: 0.3, sourceReference: birSource },
      { effectiveFrom: new Date("2023-01-01"), payPeriodType: PayPeriodType.SEMI_MONTHLY, bracketFloor: 333333, bracketCeiling: null, baseTax: 91770.7, excessRate: 0.35, sourceReference: birSource },
      // Monthly (kept for reference / future non-semi-monthly support)
      { effectiveFrom: new Date("2023-01-01"), payPeriodType: PayPeriodType.MONTHLY, bracketFloor: 0, bracketCeiling: 20833, baseTax: 0, excessRate: 0, sourceReference: birSource },
      { effectiveFrom: new Date("2023-01-01"), payPeriodType: PayPeriodType.MONTHLY, bracketFloor: 20833, bracketCeiling: 33332, baseTax: 0, excessRate: 0.15, sourceReference: birSource },
      { effectiveFrom: new Date("2023-01-01"), payPeriodType: PayPeriodType.MONTHLY, bracketFloor: 33333, bracketCeiling: 66666, baseTax: 1875, excessRate: 0.2, sourceReference: birSource },
      { effectiveFrom: new Date("2023-01-01"), payPeriodType: PayPeriodType.MONTHLY, bracketFloor: 66667, bracketCeiling: 166666, baseTax: 8541.8, excessRate: 0.25, sourceReference: birSource },
      { effectiveFrom: new Date("2023-01-01"), payPeriodType: PayPeriodType.MONTHLY, bracketFloor: 166667, bracketCeiling: 666666, baseTax: 33541.8, excessRate: 0.3, sourceReference: birSource },
      { effectiveFrom: new Date("2023-01-01"), payPeriodType: PayPeriodType.MONTHLY, bracketFloor: 666667, bracketCeiling: null, baseTax: 183541.8, excessRate: 0.35, sourceReference: birSource },
      // Annual — used only by the year-end annualization engine (BIR 2316),
      // not for per-cutoff withholding. Independently well-known TRAIN
      // figures, not derived from the monthly table (avoids compounding
      // rounding from the ~249,996 vs 250,000 threshold discrepancy).
      { effectiveFrom: new Date("2023-01-01"), payPeriodType: PayPeriodType.ANNUAL, bracketFloor: 0, bracketCeiling: 250000, baseTax: 0, excessRate: 0, sourceReference: birSource },
      { effectiveFrom: new Date("2023-01-01"), payPeriodType: PayPeriodType.ANNUAL, bracketFloor: 250000, bracketCeiling: 400000, baseTax: 0, excessRate: 0.15, sourceReference: birSource },
      { effectiveFrom: new Date("2023-01-01"), payPeriodType: PayPeriodType.ANNUAL, bracketFloor: 400000, bracketCeiling: 800000, baseTax: 22500, excessRate: 0.2, sourceReference: birSource },
      { effectiveFrom: new Date("2023-01-01"), payPeriodType: PayPeriodType.ANNUAL, bracketFloor: 800000, bracketCeiling: 2000000, baseTax: 102500, excessRate: 0.25, sourceReference: birSource },
      { effectiveFrom: new Date("2023-01-01"), payPeriodType: PayPeriodType.ANNUAL, bracketFloor: 2000000, bracketCeiling: 8000000, baseTax: 402500, excessRate: 0.3, sourceReference: birSource },
      { effectiveFrom: new Date("2023-01-01"), payPeriodType: PayPeriodType.ANNUAL, bracketFloor: 8000000, bracketCeiling: null, baseTax: 2202500, excessRate: 0.35, sourceReference: birSource },
    ],
  });
  console.log("Seeded BIR withholding tax brackets (semi-monthly + monthly + annual)");

  const deMinimisSource =
    "BIR RR No. 29-2025, effective ~Jan 2026 — figures corroborated across secondary sources, " +
    "VERIFY exact effectivity date and amounts against the official RR text before go-live";
  await prisma.deMinimisCeiling.deleteMany({});
  await prisma.deMinimisCeiling.createMany({
    data: [
      { effectiveFrom: new Date("2026-01-06"), category: DeMinimisCategory.RICE_SUBSIDY, ceilingAmount: 2500, frequency: DeMinimisFrequency.MONTHLY, sourceReference: deMinimisSource },
      { effectiveFrom: new Date("2026-01-06"), category: DeMinimisCategory.UNIFORM_CLOTHING, ceilingAmount: 8000, frequency: DeMinimisFrequency.ANNUAL, sourceReference: deMinimisSource },
      { effectiveFrom: new Date("2026-01-06"), category: DeMinimisCategory.MEDICAL_CASH_ALLOWANCE, ceilingAmount: 4000, frequency: DeMinimisFrequency.ANNUAL, sourceReference: deMinimisSource },
      { effectiveFrom: new Date("2026-01-06"), category: DeMinimisCategory.MEDICAL_ASSISTANCE, ceilingAmount: 12000, frequency: DeMinimisFrequency.ANNUAL, sourceReference: deMinimisSource },
      { effectiveFrom: new Date("2026-01-06"), category: DeMinimisCategory.LAUNDRY, ceilingAmount: 400, frequency: DeMinimisFrequency.MONTHLY, sourceReference: deMinimisSource },
      { effectiveFrom: new Date("2026-01-06"), category: DeMinimisCategory.ACHIEVEMENT_AWARD, ceilingAmount: 12000, frequency: DeMinimisFrequency.ANNUAL, sourceReference: deMinimisSource },
      { effectiveFrom: new Date("2026-01-06"), category: DeMinimisCategory.CHRISTMAS_ANNIVERSARY_GIFT, ceilingAmount: 6000, frequency: DeMinimisFrequency.ANNUAL, sourceReference: deMinimisSource },
      { effectiveFrom: new Date("2026-01-06"), category: DeMinimisCategory.CBA_PRODUCTIVITY_INCENTIVE, ceilingAmount: 12000, frequency: DeMinimisFrequency.ANNUAL, sourceReference: deMinimisSource },
    ],
  });
  console.log("Seeded de minimis ceilings");

  await prisma.thirteenthMonthConfig.upsert({
    where: { id: "13th-month-2018" },
    update: {},
    create: {
      id: "13th-month-2018",
      effectiveFrom: new Date("2018-01-01"),
      exemptionCeiling: 90000,
      sourceReference: "TRAIN law amendment to NIRC Sec. 32(B)(7)(e), unchanged since 2018",
    },
  });
  console.log("Seeded 13th month exemption ceiling");

  await prisma.minimumWageRate.deleteMany({});
  await prisma.minimumWageRate.createMany({
    data: [
      {
        effectiveFrom: new Date("2025-07-18"),
        effectiveTo: new Date("2026-07-18"),
        region: "NCR",
        sector: WageSector.NON_AGRICULTURE,
        dailyRate: 695,
        wageOrderReference: "Wage Order NCR-26",
      },
      {
        effectiveFrom: new Date("2026-07-19"),
        region: "NCR",
        sector: WageSector.NON_AGRICULTURE,
        dailyRate: 780,
        wageOrderReference: "Wage Order NCR-27 (phase 1)",
      },
    ],
  });
  console.log("Seeded minimum wage rates (NCR example only — advisory use, expand per region as needed)");

  // ---------- Demo tenant data (for tenant-isolation verification) ----------

  const demoCompany = await prisma.company.upsert({
    where: { companyCode: "demo-co" },
    update: {},
    create: {
      companyCode: "demo-co",
      legalName: "Demo Trading Corp.",
      tin: "000-111-222-000",
      rdoCode: "RDO-039",
      sssEmployerNumber: "03-9999999-9",
      philhealthEmployerNumber: "11-000111222-0",
      pagibigEmployerId: "0000-0000-0000",
      registeredAddress: "123 Sample St., Quezon City, Metro Manila",
      region: "NCR",
      status: CompanyStatus.ACTIVE,
      branches: {
        create: {
          branchCode: "0000",
          name: "Head Office",
          address: "123 Sample St., Quezon City, Metro Manila",
          region: "NCR",
          isHeadOffice: true,
        },
      },
    },
  });

  const ownerPassword = await bcrypt.hash("ChangeMe123!", 10);
  const owner = await prisma.user.upsert({
    where: { email: "owner@demo-co.local" },
    update: {},
    create: { email: "owner@demo-co.local", password: ownerPassword, name: "Demo Co Owner" },
  });

  await prisma.companyMembership.upsert({
    where: { userId_companyId: { userId: owner.id, companyId: demoCompany.id } },
    update: {},
    create: { userId: owner.id, companyId: demoCompany.id, role: CompanyRole.COMPANY_OWNER },
  });

  // Newly onboarded companies get this automatically via the /api/companies
  // route — the demo company here was seeded directly, so it's granted
  // separately for local testing.
  await prisma.leaveType.upsert({
    where: { companyId_code: { companyId: demoCompany.id, code: "SIL" } },
    update: {},
    create: {
      companyId: demoCompany.id,
      name: "Service Incentive Leave",
      code: "SIL",
      isPaid: true,
      isStatutory: true,
      accrualPolicy: "ANNUAL_GRANT",
      defaultDaysPerYear: 5,
      isCarryOverAllowed: false,
      isConvertibleToCash: true,
    },
  });

  // Backfill a current-year SIL balance for any employees added before this
  // leave type existed (new employees get this automatically at creation).
  const silType = await prisma.leaveType.findUniqueOrThrow({
    where: { companyId_code: { companyId: demoCompany.id, code: "SIL" } },
  });
  const existingEmployees = await prisma.employee.findMany({ where: { companyId: demoCompany.id } });
  for (const emp of existingEmployees) {
    await prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: emp.id,
          leaveTypeId: silType.id,
          year: new Date().getFullYear(),
        },
      },
      update: {},
      create: {
        employeeId: emp.id,
        leaveTypeId: silType.id,
        year: new Date().getFullYear(),
        entitledDays: silType.defaultDaysPerYear,
      },
    });
  }

  console.log(`Seeded demo company "${demoCompany.legalName}" with owner ${owner.email} (password: ChangeMe123!)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
