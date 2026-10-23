import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  CompanyRole,
  CompanyStatus,
  EmployeeType,
  EmploymentStatus,
  PayBasis,
  PaymentMethod,
  Sex,
  CivilStatus,
  StatutoryDeductionMode,
  DeMinimisCategory,
  AllowanceFrequency,
  LoanCategory,
  LoanStatus,
  LoanDeductionFrequency,
  TimesheetStatus,
  PeriodType,
} from "../lib/generated/prisma/enums";
import { computeAndPersistPayrollRun } from "../lib/services/payrollRunService";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function seedDemoCompany() {
  console.log("🚀 Starting Dummy Demo Company & Test Employees Seed...");

  // 1. Create or update the demo company
  const companyCode = "acme-demo";
  const demoCompany = await prisma.company.upsert({
    where: { companyCode },
    update: {
      status: CompanyStatus.ACTIVE,
      legalName: "Acme Technologies Philippines, Inc. (DEMO)",
      tradeName: "Acme Tech PH (Demo)",
    },
    create: {
      companyCode,
      legalName: "Acme Technologies Philippines, Inc. (DEMO)",
      tradeName: "Acme Tech PH (Demo)",
      tin: "999-888-777-000",
      rdoCode: "039",
      sssEmployerNumber: "03-8888888-1",
      philhealthEmployerNumber: "12-888888888-1",
      pagibigEmployerId: "8888-8888-8888",
      registeredAddress: "Unit 1801, Prestige Tower, F. Ortigas Jr. Rd., Ortigas Center, Pasig City",
      region: "NCR",
      status: CompanyStatus.ACTIVE,
      payScheduleStyle: "STANDARD_1_15",
      cutoff1StartDay: 1,
      cutoff1EndDay: 15,
      cutoff2StartDay: 16,
      cutoff2EndDay: 0,
      payDateOffsetDays: 5,
      standardWorkDaysPerMonth: 26.0,
      statutoryDeductionTiming: "SECOND_HALF",
      basicPayFrequency: "TWICE_A_MONTH",
      allowancePayFrequency: "TWICE_A_MONTH",
      attendanceStandardTimeIn: "09:00",
      attendanceStandardTimeOut: "18:00",
      attendanceLunchBreakMinutes: 60,
      attendanceLateGracePeriodMinutes: 15,
      attendanceOtGracePeriodMinutes: 15,
    },
  });
  console.log(`✅ Company ready: ${demoCompany.legalName} (${demoCompany.companyCode})`);

  // 2. Branches
  const headOffice = await prisma.companyBranch.upsert({
    where: { companyId_branchCode: { companyId: demoCompany.id, branchCode: "0000" } },
    update: {},
    create: {
      companyId: demoCompany.id,
      branchCode: "0000",
      name: "Head Office - Ortigas",
      address: "Unit 1801, Prestige Tower, Ortigas Center, Pasig City",
      region: "NCR",
      isHeadOffice: true,
    },
  });

  const cebuBranch = await prisma.companyBranch.upsert({
    where: { companyId_branchCode: { companyId: demoCompany.id, branchCode: "0001" } },
    update: {},
    create: {
      companyId: demoCompany.id,
      branchCode: "0001",
      name: "Cebu Innovation Hub",
      address: "7th Floor, Central Bloc, Cebu IT Park, Lahug, Cebu City",
      region: "Region VII",
      isHeadOffice: false,
    },
  });
  console.log("✅ Branches seeded: Head Office & Cebu Innovation Hub");

  // 3. Bank Accounts
  const bdoBank = await prisma.companyBankAccount.upsert({
    where: { id: `bdo-${demoCompany.id}` },
    update: {},
    create: {
      id: `bdo-${demoCompany.id}`,
      companyId: demoCompany.id,
      bankName: "BDO Unibank",
      nickname: "BDO Corporate Payroll",
      accountNumber: "001234567890",
      accountName: "Acme Technologies Philippines Inc.",
      branchName: "Ortigas Emerald",
      isDefault: true,
    },
  });

  await prisma.companyBankAccount.upsert({
    where: { id: `bpi-${demoCompany.id}` },
    update: {},
    create: {
      id: `bpi-${demoCompany.id}`,
      companyId: demoCompany.id,
      bankName: "Bank of the Philippine Islands (BPI)",
      nickname: "BPI Operating Account",
      accountNumber: "1987654321",
      accountName: "Acme Technologies Philippines Inc.",
      branchName: "Pasig Blvd",
      isDefault: false,
    },
  });
  console.log("✅ Bank accounts seeded (BDO Unibank & BPI)");

  // 4. Leave Types
  const sil = await prisma.leaveType.upsert({
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

  const vl = await prisma.leaveType.upsert({
    where: { companyId_code: { companyId: demoCompany.id, code: "VL" } },
    update: {},
    create: {
      companyId: demoCompany.id,
      name: "Vacation Leave",
      code: "VL",
      isPaid: true,
      isStatutory: false,
      accrualPolicy: "ANNUAL_GRANT",
      defaultDaysPerYear: 12,
      isCarryOverAllowed: true,
      isConvertibleToCash: true,
    },
  });

  const sl = await prisma.leaveType.upsert({
    where: { companyId_code: { companyId: demoCompany.id, code: "SL" } },
    update: {},
    create: {
      companyId: demoCompany.id,
      name: "Sick Leave",
      code: "SL",
      isPaid: true,
      isStatutory: false,
      accrualPolicy: "ANNUAL_GRANT",
      defaultDaysPerYear: 10,
      isCarryOverAllowed: false,
      isConvertibleToCash: false,
    },
  });
  console.log("✅ Leave types seeded (SIL, VL, SL)");

  // 5. Connect all existing users so the demo company is visible in the switcher
  const existingUsers = await prisma.user.findMany({ select: { id: true, email: true } });
  for (const user of existingUsers) {
    const role =
      user.email === "snaken123@yahoo.com" ||
      user.email === "rcsii@1plscoinc.com" ||
      user.email === "claire.c.salazar@gmail.com" ||
      user.email === "cccs@temp.com"
        ? CompanyRole.COMPANY_OWNER
        : user.email === "oliber.deleon18@gmail.com"
        ? CompanyRole.PAYROLL_ADMIN
        : CompanyRole.APPROVER;

    await prisma.companyMembership.upsert({
      where: { userId_companyId: { userId: user.id, companyId: demoCompany.id } },
      update: { role, isActive: true },
      create: { userId: user.id, companyId: demoCompany.id, role, isActive: true },
    });
  }
  console.log(`✅ User memberships granted across ${existingUsers.length} accounts`);

  // 6. Test Employees Definition
  const testEmployees = [
    {
      employeeNumber: "ACM-001",
      firstName: "Alexander",
      lastName: "Santos",
      middleName: "Dela Rosa",
      birthDate: new Date("1985-04-12"),
      sex: Sex.MALE,
      civilStatus: CivilStatus.MARRIED,
      personalEmail: "alex.santos.demo@example.com",
      mobileNumber: "09171234501",
      tin: "123-456-789-001",
      sssNumber: "03-1234567-1",
      philhealthNumber: "12-123456789-1",
      pagibigNumber: "1212-3434-5651",
      employeeType: EmployeeType.MANAGERIAL_SUPERVISORY,
      employmentStatus: EmploymentStatus.REGULAR,
      dateHired: new Date("2021-03-01"),
      dateRegularized: new Date("2021-09-01"),
      positionTitle: "VP of Engineering",
      departmentName: "Executive & Technology",
      isManagerialExempt: true,
      managerialExemptReason: "Managerial employee per Labor Code Art. 82",
      bankName: "BDO Unibank",
      bankAccountNumber: "1092837465",
      branchId: headOffice.id,
      payBasis: PayBasis.MONTHLY_RATE,
      basicRate: 145000,
      allowances: [
        { label: "Rice Subsidy", amount: 2000, isTaxable: false, isDeMinimis: true, category: DeMinimisCategory.RICE_SUBSIDY },
        { label: "Laundry Allowance", amount: 300, isTaxable: false, isDeMinimis: true, category: DeMinimisCategory.LAUNDRY },
      ],
    },
    {
      employeeNumber: "ACM-002",
      firstName: "Maria Cristina",
      lastName: "Reyes",
      middleName: "Bautista",
      birthDate: new Date("1992-08-23"),
      sex: Sex.FEMALE,
      civilStatus: CivilStatus.SINGLE,
      personalEmail: "tina.reyes.demo@example.com",
      mobileNumber: "09171234502",
      tin: "123-456-789-002",
      sssNumber: "03-1234567-2",
      philhealthNumber: "12-123456789-2",
      pagibigNumber: "1212-3434-5652",
      employeeType: EmployeeType.MONTHLY_RANK_AND_FILE,
      employmentStatus: EmploymentStatus.REGULAR,
      dateHired: new Date("2022-06-15"),
      dateRegularized: new Date("2022-12-15"),
      positionTitle: "Senior Full-Stack Developer",
      departmentName: "Engineering",
      isManagerialExempt: false,
      bankName: "BDO Unibank",
      bankAccountNumber: "1092837466",
      branchId: headOffice.id,
      payBasis: PayBasis.MONTHLY_RATE,
      basicRate: 65000,
      allowances: [
        { label: "Rice Subsidy", amount: 2000, isTaxable: false, isDeMinimis: true, category: DeMinimisCategory.RICE_SUBSIDY },
      ],
    },
    {
      employeeNumber: "ACM-003",
      firstName: "Juan Carlo",
      lastName: "Mendoza",
      middleName: "Navarro",
      birthDate: new Date("1997-11-05"),
      sex: Sex.MALE,
      civilStatus: CivilStatus.SINGLE,
      personalEmail: "jc.mendoza.demo@example.com",
      mobileNumber: "09171234503",
      tin: "123-456-789-003",
      sssNumber: "03-1234567-3",
      philhealthNumber: "12-123456789-3",
      pagibigNumber: "1212-3434-5653",
      employeeType: EmployeeType.MONTHLY_RANK_AND_FILE,
      employmentStatus: EmploymentStatus.PROBATIONARY,
      dateHired: new Date("2026-07-01"),
      positionTitle: "Quality Assurance Analyst",
      departmentName: "Engineering",
      isManagerialExempt: false,
      bankName: "BPI",
      bankAccountNumber: "2083948571",
      branchId: headOffice.id,
      payBasis: PayBasis.MONTHLY_RATE,
      basicRate: 38000,
      allowances: [
        { label: "Rice Subsidy", amount: 2000, isTaxable: false, isDeMinimis: true, category: DeMinimisCategory.RICE_SUBSIDY },
        { label: "Laundry Allowance", amount: 300, isTaxable: false, isDeMinimis: true, category: DeMinimisCategory.LAUNDRY },
      ],
    },
    {
      employeeNumber: "ACM-004",
      firstName: "Bea Angelica",
      lastName: "Garcia",
      middleName: "Soriano",
      birthDate: new Date("1994-02-18"),
      sex: Sex.FEMALE,
      civilStatus: CivilStatus.SINGLE,
      personalEmail: "bea.garcia.demo@example.com",
      mobileNumber: "09171234504",
      tin: "123-456-789-004",
      sssNumber: "03-1234567-4",
      philhealthNumber: "12-123456789-4",
      pagibigNumber: "1212-3434-5654",
      employeeType: EmployeeType.MONTHLY_RANK_AND_FILE,
      employmentStatus: EmploymentStatus.REGULAR,
      dateHired: new Date("2023-01-10"),
      dateRegularized: new Date("2023-07-10"),
      positionTitle: "HR & Payroll Specialist",
      departmentName: "Human Resources",
      isManagerialExempt: false,
      bankName: "BDO Unibank",
      bankAccountNumber: "1092837467",
      branchId: headOffice.id,
      payBasis: PayBasis.MONTHLY_RATE,
      basicRate: 32000,
      allowances: [
        { label: "Rice Subsidy", amount: 2000, isTaxable: false, isDeMinimis: true, category: DeMinimisCategory.RICE_SUBSIDY },
      ],
    },
    {
      employeeNumber: "ACM-005",
      firstName: "Gabriel",
      lastName: "Dizon",
      middleName: "Villanueva",
      birthDate: new Date("1999-05-30"),
      sex: Sex.MALE,
      civilStatus: CivilStatus.SINGLE,
      personalEmail: "gabe.dizon.demo@example.com",
      mobileNumber: "09171234505",
      tin: "123-456-789-005",
      sssNumber: "03-1234567-5",
      philhealthNumber: "12-123456789-5",
      pagibigNumber: "1212-3434-5655",
      employeeType: EmployeeType.MONTHLY_RANK_AND_FILE,
      employmentStatus: EmploymentStatus.REGULAR,
      dateHired: new Date("2023-09-01"),
      dateRegularized: new Date("2024-03-01"),
      positionTitle: "Technical Support Representative",
      departmentName: "Customer Experience",
      isManagerialExempt: false,
      bankName: "BDO Unibank",
      bankAccountNumber: "1092837468",
      branchId: headOffice.id,
      payBasis: PayBasis.MONTHLY_RATE,
      basicRate: 26000,
      allowances: [
        { label: "Rice Subsidy", amount: 2000, isTaxable: false, isDeMinimis: true, category: DeMinimisCategory.RICE_SUBSIDY },
        { label: "Meal Allowance", amount: 1500, isTaxable: true, isDeMinimis: false },
      ],
    },
    {
      employeeNumber: "ACM-006",
      firstName: "Ramon",
      lastName: "Bautista",
      middleName: "Aquino",
      birthDate: new Date("1989-10-14"),
      sex: Sex.MALE,
      civilStatus: CivilStatus.MARRIED,
      personalEmail: "mon.bautista.demo@example.com",
      mobileNumber: "09171234506",
      tin: "123-456-789-006",
      sssNumber: "03-1234567-6",
      philhealthNumber: "12-123456789-6",
      pagibigNumber: "1212-3434-5656",
      employeeType: EmployeeType.DAILY_HOURLY,
      employmentStatus: EmploymentStatus.REGULAR,
      dateHired: new Date("2022-02-01"),
      dateRegularized: new Date("2022-08-01"),
      positionTitle: "Facilities & Inventory Assistant",
      departmentName: "Administration & Logistics",
      isManagerialExempt: false,
      bankName: "BPI",
      bankAccountNumber: "2083948572",
      branchId: headOffice.id,
      payBasis: PayBasis.DAILY_RATE,
      basicRate: 850,
      allowances: [],
    },
    {
      employeeNumber: "ACM-007",
      firstName: "Patricia Mae",
      lastName: "Ramos",
      middleName: "Castillo",
      birthDate: new Date("2002-03-22"),
      sex: Sex.FEMALE,
      civilStatus: CivilStatus.SINGLE,
      personalEmail: "patty.ramos.demo@example.com",
      mobileNumber: "09171234507",
      tin: "123-456-789-007",
      sssNumber: "03-1234567-7",
      philhealthNumber: "12-123456789-7",
      pagibigNumber: "1212-3434-5657",
      employeeType: EmployeeType.DAILY_HOURLY,
      employmentStatus: EmploymentStatus.REGULAR,
      dateHired: new Date("2024-01-15"),
      dateRegularized: new Date("2024-07-15"),
      positionTitle: "Junior Administrative Clerk",
      departmentName: "Administration",
      isManagerialExempt: false,
      bankName: "BDO Unibank",
      bankAccountNumber: "1092837469",
      branchId: headOffice.id,
      payBasis: PayBasis.DAILY_RATE,
      basicRate: 695, // Exact NCR Minimum Wage (Tax Exempt demo)
      allowances: [],
    },
    {
      employeeNumber: "ACM-008",
      firstName: "Fernando",
      lastName: "Cruz",
      middleName: "Legaspi",
      suffix: "Esq.",
      birthDate: new Date("1980-06-19"),
      sex: Sex.MALE,
      civilStatus: CivilStatus.MARRIED,
      personalEmail: "atty.cruz.demo@example.com",
      mobileNumber: "09171234508",
      tin: "123-456-789-008",
      sssNumber: "03-1234567-8",
      philhealthNumber: "12-123456789-8",
      pagibigNumber: "1212-3434-5658",
      employeeType: EmployeeType.MONTHLY_RANK_AND_FILE,
      employmentStatus: EmploymentStatus.RETAINER,
      dateHired: new Date("2023-04-01"),
      positionTitle: "Corporate Compliance Counsel",
      departmentName: "Legal",
      isManagerialExempt: true,
      bankName: "BPI",
      bankAccountNumber: "2083948573",
      branchId: headOffice.id,
      payBasis: PayBasis.MONTHLY_RATE,
      basicRate: 50000,
      allowances: [],
    },
    {
      employeeNumber: "ACM-009",
      firstName: "Janine Katrina",
      lastName: "Dela Cruz",
      middleName: "Tan",
      birthDate: new Date("1995-12-04"),
      sex: Sex.FEMALE,
      civilStatus: CivilStatus.SINGLE,
      personalEmail: "kat.delacruz.demo@example.com",
      mobileNumber: "09171234509",
      tin: "123-456-789-009",
      sssNumber: "03-1234567-9",
      philhealthNumber: "12-123456789-9",
      pagibigNumber: "1212-3434-5659",
      employeeType: EmployeeType.MONTHLY_RANK_AND_FILE,
      employmentStatus: EmploymentStatus.RESIGNED,
      dateHired: new Date("2023-05-01"),
      dateRegularized: new Date("2023-11-01"),
      dateSeparated: new Date("2026-09-30"),
      separationReason: "Voluntary career change",
      positionTitle: "Marketing Communications Specialist",
      departmentName: "Marketing",
      isManagerialExempt: false,
      bankName: "BDO Unibank",
      bankAccountNumber: "1092837470",
      branchId: headOffice.id,
      payBasis: PayBasis.MONTHLY_RATE,
      basicRate: 42000,
      allowances: [],
    },
    {
      employeeNumber: "ACM-010",
      firstName: "Miguel",
      lastName: "Tan",
      middleName: "Chua",
      birthDate: new Date("1991-09-17"),
      sex: Sex.MALE,
      civilStatus: CivilStatus.MARRIED,
      personalEmail: "miggy.tan.demo@example.com",
      mobileNumber: "09171234510",
      tin: "123-456-789-010",
      sssNumber: "03-1234567-0",
      philhealthNumber: "12-123456789-0",
      pagibigNumber: "1212-3434-5650",
      employeeType: EmployeeType.MONTHLY_RANK_AND_FILE,
      employmentStatus: EmploymentStatus.REGULAR,
      dateHired: new Date("2022-10-01"),
      dateRegularized: new Date("2023-04-01"),
      positionTitle: "Solutions Architect (Visayas)",
      departmentName: "Engineering",
      isManagerialExempt: false,
      bankName: "BDO Unibank",
      bankAccountNumber: "1092837471",
      branchId: cebuBranch.id,
      payBasis: PayBasis.MONTHLY_RATE,
      basicRate: 88000,
      allowances: [
        { label: "Rice Subsidy", amount: 2000, isTaxable: false, isDeMinimis: true, category: DeMinimisCategory.RICE_SUBSIDY },
      ],
    },
  ];

  const createdEmployeeMap = new Map<string, any>();

  for (const empData of testEmployees) {
    const { payBasis, basicRate, allowances, branchId, ...fields } = empData;

    const employee = await prisma.employee.upsert({
      where: { companyId_employeeNumber: { companyId: demoCompany.id, employeeNumber: fields.employeeNumber } },
      update: {
        ...fields,
        branchId,
        isDeductSss: true,
        isDeductPhilhealth: true,
        isDeductPagibig: true,
        isDeductWithholdingTax: true,
        sssDeductionMode: StatutoryDeductionMode.TABLE,
        philhealthDeductionMode: StatutoryDeductionMode.TABLE,
        pagibigDeductionMode: StatutoryDeductionMode.TABLE,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        primaryCompanyBankId: bdoBank.id,
      },
      create: {
        ...fields,
        companyId: demoCompany.id,
        branchId,
        isDeductSss: true,
        isDeductPhilhealth: true,
        isDeductPagibig: true,
        isDeductWithholdingTax: true,
        sssDeductionMode: StatutoryDeductionMode.TABLE,
        philhealthDeductionMode: StatutoryDeductionMode.TABLE,
        pagibigDeductionMode: StatutoryDeductionMode.TABLE,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        primaryCompanyBankId: bdoBank.id,
      },
    });

    createdEmployeeMap.set(employee.employeeNumber, employee);

    // Compensation record
    const existingComp = await prisma.compensationRecord.findFirst({
      where: { employeeId: employee.id, effectiveTo: null },
    });

    if (!existingComp) {
      const comp = await prisma.compensationRecord.create({
        data: {
          employeeId: employee.id,
          effectiveFrom: employee.dateHired,
          payBasis,
          basicRate,
          isTaxable: true,
          standardWorkDaysPerMonth: 26.0,
        },
      });

      for (const alw of allowances) {
        await prisma.allowanceLine.create({
          data: {
            compensationRecordId: comp.id,
            label: alw.label,
            amount: alw.amount,
            frequency: AllowanceFrequency.MONTHLY,
            isTaxable: alw.isTaxable,
            isDeMinimis: alw.isDeMinimis,
            deMinimisCategory: alw.category || null,
          },
        });
      }
    }

    // Leave balances
    const currentYear = new Date().getFullYear();
    for (const lt of [sil, vl, sl]) {
      await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: employee.id,
            leaveTypeId: lt.id,
            year: currentYear,
          },
        },
        update: {},
        create: {
          employeeId: employee.id,
          leaveTypeId: lt.id,
          year: currentYear,
          entitledDays: lt.defaultDaysPerYear,
          usedDays: 0,
        },
      });
    }
  }
  console.log(`✅ Seeded ${testEmployees.length} test employees with compensations, allowances & leave balances`);

  // 7. Active Demo Loans
  const emp2 = createdEmployeeMap.get("ACM-002");
  if (emp2) {
    await prisma.loan.upsert({
      where: { id: `loan-pagibig-${emp2.id}` },
      update: {},
      create: {
        id: `loan-pagibig-${emp2.id}`,
        companyId: demoCompany.id,
        employeeId: emp2.id,
        category: LoanCategory.PAGIBIG_LOAN,
        name: "Pag-IBIG Multi-Purpose Loan (MPL)",
        principal: 30000,
        termMonths: 24,
        installmentAmount: 1250,
        deductionFrequency: LoanDeductionFrequency.EVERY_CUTOFF,
        startDate: new Date("2026-01-01"),
        referenceNumber: "HDMF-MPL-2026-8812",
        status: LoanStatus.ACTIVE,
        remainingBalance: 22500,
      },
    });
  }

  const emp3 = createdEmployeeMap.get("ACM-003");
  if (emp3) {
    await prisma.loan.upsert({
      where: { id: `loan-sss-${emp3.id}` },
      update: {},
      create: {
        id: `loan-sss-${emp3.id}`,
        companyId: demoCompany.id,
        employeeId: emp3.id,
        category: LoanCategory.SSS_LOAN,
        name: "SSS Salary Loan",
        principal: 20000,
        termMonths: 24,
        installmentAmount: 850,
        deductionFrequency: LoanDeductionFrequency.EVERY_CUTOFF,
        startDate: new Date("2026-08-01"),
        referenceNumber: "SSS-SL-2026-9041",
        status: LoanStatus.ACTIVE,
        remainingBalance: 18300,
      },
    });
  }
  console.log("✅ Seeded demo loans (Pag-IBIG MPL & SSS Salary Loan)");

  // 8. Generate timesheet records for active employees for the Oct 1 - Oct 15, 2026 cutoff
  const activeEmployees = Array.from(createdEmployeeMap.values()).filter(
    (e) => e.employmentStatus !== EmploymentStatus.RESIGNED
  );

  const cutoffStartDate = new Date("2026-10-01");
  const cutoffEndDate = new Date("2026-10-15");

  for (const emp of activeEmployees) {
    for (let day = 1; day <= 15; day++) {
      const dateStr = `2026-10-${String(day).padStart(2, "0")}`;
      const d = new Date(`${dateStr}T00:00:00.000Z`);
      const dayOfWeek = d.getUTCDay(); // 0 is Sunday

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
          companyId: demoCompany.id,
          employeeId: emp.id,
          workDate: d,
          timeIn: isSaturday
            ? new Date(`${dateStr}T08:30:00.000Z`)
            : new Date(`${dateStr}T09:00:00.000Z`),
          timeOut: isSaturday
            ? new Date(`${dateStr}T13:30:00.000Z`)
            : new Date(`${dateStr}T18:00:00.000Z`),
          regularHours: isSaturday ? 5 : 8,
          overtimeHours: emp.employeeNumber === "ACM-002" && day === 10 ? 2.5 : 0,
          nightDiffHours: emp.employeeNumber === "ACM-005" ? 1.5 : 0,
          lateMinutes: day === 3 && emp.employeeNumber === "ACM-003" ? 20 : 0,
          status: TimesheetStatus.PRESENT,
        },
      });
    }
  }
  console.log("✅ Seeded attendance timesheet records for Oct 1 - 15, 2026");

  // 9. Compute & Post a Completed Demo Payroll Run
  const superAdmin = await prisma.user.findFirst({
    where: { platformRole: "SUPER_ADMIN" },
    select: { id: true },
  });
  const adminUserId = superAdmin?.id || existingUsers[0]?.id;

  try {
    const existingRun = await prisma.payrollRun.findFirst({
      where: { companyId: demoCompany.id, runNumber: 1 },
    });

    if (!existingRun) {
      console.log("⚙️  Computing demo payroll run for Oct 1 - 15, 2026...");
      const runId = await computeAndPersistPayrollRun({
        companyId: demoCompany.id,
        cutoffStart: cutoffStartDate,
        cutoffEnd: cutoffEndDate,
        payDate: new Date("2026-10-20"),
        periodType: PeriodType.FIRST_HALF,
        computedByUserId: adminUserId,
      });

      // Approve run
      await prisma.payrollRun.update({
        where: { id: runId },
        data: {
          status: "APPROVED",
          approvedAt: new Date("2026-10-16"),
          approvedByUserId: adminUserId,
        },
      });

      // Post run
      const postedRun = await prisma.payrollRun.update({
        where: { id: runId },
        data: {
          status: "POSTED",
          postedAt: new Date("2026-10-18"),
          postedByUserId: adminUserId,
        },
        include: {
          payslips: true,
        },
      });

      // Issue sample payout check
      const totalNetPay = postedRun.payslips.reduce((sum, p) => sum + p.netPay.toNumber(), 0);
      await prisma.payrollPaymentCheck.create({
        data: {
          companyId: demoCompany.id,
          payrollRunId: runId,
          checkNumber: "CHK-2026-00101",
          checkDate: new Date("2026-10-20"),
          amount: totalNetPay,
          bankAccountId: bdoBank.id,
          bankName: "BDO Unibank",
          payee: "Acme Technologies Philippines Inc. — Net Payroll Payout",
          notes: "Official corporate disbursement check for semi-monthly payroll cutoff Oct 1 - 15, 2026",
          status: "ISSUED",
          issuedByUserId: adminUserId,
        },
      });

      console.log(`✅ Demo Payroll Run #1 computed, approved, posted with payslips & check issued! (Total Net: ₱${totalNetPay.toLocaleString()})`);
    } else {
      console.log("ℹ️  Demo Payroll Run #1 already exists.");
    }
  } catch (err) {
    console.warn("⚠️  Could not auto-compute sample payroll run:", err);
  }

  console.log("\n🎉 DEMO COMPANY CREATED SUCCESSFULLY!");
  console.log("--------------------------------------------------");
  console.log(`Company Name:   ${demoCompany.legalName}`);
  console.log(`Company Code:   ${demoCompany.companyCode}`);
  console.log(`Test Employees: ${testEmployees.length} active/sample employees across all roles`);
  console.log(`Bank Accounts:  BDO Unibank & BPI`);
  console.log(`Branches:       Head Office (Ortigas, NCR) & Cebu Innovation Hub`);
  console.log(`User Access:    Available in the company switcher for all active users`);
  console.log("--------------------------------------------------");
}

seedDemoCompany()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
