-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('STANDARD', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "CompanyRole" AS ENUM ('COMPANY_OWNER', 'PAYROLL_ADMIN', 'HR_STAFF', 'APPROVER', 'EMPLOYEE_SELF');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ONBOARDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "EmployeeType" AS ENUM ('MONTHLY_RANK_AND_FILE', 'DAILY_HOURLY', 'MANAGERIAL_SUPERVISORY');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('PROBATIONARY', 'REGULAR', 'RESIGNED', 'TERMINATED', 'AWOL', 'RETIRED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CASH', 'CHECK');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "CivilStatus" AS ENUM ('SINGLE', 'MARRIED', 'WIDOWED', 'SEPARATED', 'ANNULLED');

-- CreateEnum
CREATE TYPE "SeparationCategory" AS ENUM ('RESIGNATION', 'TERMINATION_FOR_CAUSE', 'AUTHORIZED_CAUSE_REDUNDANCY', 'AUTHORIZED_CAUSE_RETRENCHMENT', 'AUTHORIZED_CAUSE_DISEASE', 'RETIREMENT', 'DEATH', 'END_OF_CONTRACT');

-- CreateEnum
CREATE TYPE "PayBasis" AS ENUM ('MONTHLY_RATE', 'DAILY_RATE', 'HOURLY_RATE');

-- CreateEnum
CREATE TYPE "DeMinimisCategory" AS ENUM ('RICE_SUBSIDY', 'UNIFORM_CLOTHING', 'MEDICAL_CASH_ALLOWANCE', 'MEDICAL_ASSISTANCE', 'LAUNDRY', 'ACHIEVEMENT_AWARD', 'CHRISTMAS_ANNIVERSARY_GIFT', 'MEAL_ALLOWANCE_OT_NIGHTSHIFT', 'MONETIZED_UNUSED_LEAVE', 'CBA_PRODUCTIVITY_INCENTIVE');

-- CreateEnum
CREATE TYPE "PayPeriodType" AS ENUM ('DAILY', 'WEEKLY', 'SEMI_MONTHLY', 'MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "DeMinimisFrequency" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "WageSector" AS ENUM ('NON_AGRICULTURE', 'AGRICULTURE', 'RETAIL_SERVICE_SMALL');

-- CreateEnum
CREATE TYPE "HolidayType" AS ENUM ('REGULAR_HOLIDAY', 'SPECIAL_NON_WORKING');

-- CreateEnum
CREATE TYPE "TimesheetStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY', 'REST_DAY');

-- CreateEnum
CREATE TYPE "TimesheetSource" AS ENUM ('MANUAL', 'BIOMETRIC_IMPORT', 'SELF_REPORTED');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('FIRST_HALF', 'SECOND_HALF');

-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'POSTED', 'VOID');

-- CreateEnum
CREATE TYPE "LineItemCategory" AS ENUM ('BASIC_PAY', 'OVERTIME', 'NIGHT_DIFF', 'HOLIDAY_PREMIUM', 'REST_DAY_PREMIUM', 'ALLOWANCE', 'SSS_EE', 'SSS_ER', 'PHILHEALTH_EE', 'PHILHEALTH_ER', 'PAGIBIG_EE', 'PAGIBIG_ER', 'WITHHOLDING_TAX', 'LOAN_DEDUCTION', 'CASH_ADVANCE', 'LATE_UNDERTIME_DEDUCTION', 'THIRTEENTH_MONTH_ACCRUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "LineItemDirection" AS ENUM ('EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION');

-- CreateEnum
CREATE TYPE "LoanCategory" AS ENUM ('SSS_LOAN', 'PAGIBIG_LOAN', 'COMPANY_LOAN', 'CASH_ADVANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LeaveAccrualPolicy" AS ENUM ('ANNUAL_GRANT', 'MONTHLY_ACCRUAL', 'NONE');

-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PAYSLIP', 'PAYROLL_REGISTER', 'SSS_R3', 'PHILHEALTH_RF1', 'PAGIBIG_MCRF', 'FORM_1601C', 'FORM_2316', 'FORM_2307', 'THIRTEENTH_MONTH_REPORT', 'FINAL_PAY_STATEMENT', 'CERTIFICATE_OF_EMPLOYMENT');

-- CreateEnum
CREATE TYPE "DocumentSourceType" AS ENUM ('PAYROLL_RUN', 'PERIOD_RANGE');

-- CreateEnum
CREATE TYPE "ContractorStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ContractorPaymentStatus" AS ENUM ('DRAFT', 'POSTED', 'VOID');

-- CreateEnum
CREATE TYPE "FinalPayRunStatus" AS ENUM ('DRAFT', 'APPROVED', 'POSTED', 'VOID');

-- CreateEnum
CREATE TYPE "FinalPayLineItemCategory" AS ENUM ('UNPAID_WAGES', 'PRORATED_THIRTEENTH_MONTH', 'LEAVE_CASHOUT', 'SEPARATION_PAY', 'RETIREMENT_PAY', 'LOAN_PAYOFF', 'WITHHOLDING_TAX_ADJUSTMENT', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT,
    "image" TEXT,
    "platformRole" "PlatformRole" NOT NULL DEFAULT 'STANDARD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" "CompanyRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "companyCode" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT,
    "tin" TEXT NOT NULL,
    "rdoCode" TEXT NOT NULL,
    "sssEmployerNumber" TEXT,
    "philhealthEmployerNumber" TEXT,
    "pagibigEmployerId" TEXT,
    "registeredAddress" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "status" "CompanyStatus" NOT NULL DEFAULT 'ONBOARDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyBranch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "isHeadOffice" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "userId" TEXT,
    "employeeNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "suffix" TEXT,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "sex" "Sex" NOT NULL,
    "civilStatus" "CivilStatus" NOT NULL,
    "tin" TEXT,
    "sssNumber" TEXT,
    "philhealthNumber" TEXT,
    "pagibigNumber" TEXT,
    "employeeType" "EmployeeType" NOT NULL,
    "employmentStatus" "EmploymentStatus" NOT NULL DEFAULT 'PROBATIONARY',
    "dateHired" TIMESTAMP(3) NOT NULL,
    "dateRegularized" TIMESTAMP(3),
    "dateSeparated" TIMESTAMP(3),
    "separationReason" TEXT,
    "separationCategory" "SeparationCategory",
    "clearanceCompleted" BOOLEAN NOT NULL DEFAULT false,
    "departmentName" TEXT,
    "positionTitle" TEXT NOT NULL,
    "isManagerialExempt" BOOLEAN NOT NULL DEFAULT false,
    "managerialExemptReason" TEXT,
    "bankAccountNumber" TEXT,
    "bankName" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompensationRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "payBasis" "PayBasis" NOT NULL,
    "basicRate" DECIMAL(14,4) NOT NULL,
    "standardWorkDaysPerMonth" DECIMAL(6,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,

    CONSTRAINT "CompensationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllowanceLine" (
    "id" TEXT NOT NULL,
    "compensationRecordId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "isTaxable" BOOLEAN NOT NULL DEFAULT true,
    "isDeMinimis" BOOLEAN NOT NULL DEFAULT false,
    "deMinimisCategory" "DeMinimisCategory",

    CONSTRAINT "AllowanceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SssContributionBracket" (
    "id" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "mscFloor" DECIMAL(12,2) NOT NULL,
    "mscCeiling" DECIMAL(12,2) NOT NULL,
    "msc" DECIMAL(12,2) NOT NULL,
    "eeShare" DECIMAL(12,2) NOT NULL,
    "erShare" DECIMAL(12,2) NOT NULL,
    "mpfEeShare" DECIMAL(12,2),
    "mpfErShare" DECIMAL(12,2),
    "ecAmount" DECIMAL(12,2) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceReference" TEXT NOT NULL,

    CONSTRAINT "SssContributionBracket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhilhealthConfig" (
    "id" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "premiumRate" DECIMAL(6,4) NOT NULL,
    "eeShareRate" DECIMAL(6,4) NOT NULL,
    "erShareRate" DECIMAL(6,4) NOT NULL,
    "floorSalary" DECIMAL(12,2) NOT NULL,
    "ceilingSalary" DECIMAL(12,2) NOT NULL,
    "sourceReference" TEXT NOT NULL,

    CONSTRAINT "PhilhealthConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagibigContributionBracket" (
    "id" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "salaryThreshold" DECIMAL(12,2) NOT NULL,
    "eeRateBelowThreshold" DECIMAL(6,4) NOT NULL,
    "erRateBelowThreshold" DECIMAL(6,4) NOT NULL,
    "eeRateAboveThreshold" DECIMAL(6,4) NOT NULL,
    "erRateAboveThreshold" DECIMAL(6,4) NOT NULL,
    "maxFundSalary" DECIMAL(12,2) NOT NULL,
    "eeCap" DECIMAL(12,2) NOT NULL,
    "erCap" DECIMAL(12,2) NOT NULL,
    "sourceReference" TEXT NOT NULL,

    CONSTRAINT "PagibigContributionBracket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BirWithholdingBracket" (
    "id" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "payPeriodType" "PayPeriodType" NOT NULL,
    "bracketFloor" DECIMAL(14,2) NOT NULL,
    "bracketCeiling" DECIMAL(14,2),
    "baseTax" DECIMAL(14,2) NOT NULL,
    "excessRate" DECIMAL(6,4) NOT NULL,
    "sourceReference" TEXT NOT NULL,

    CONSTRAINT "BirWithholdingBracket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeMinimisCeiling" (
    "id" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "category" "DeMinimisCategory" NOT NULL,
    "ceilingAmount" DECIMAL(12,2) NOT NULL,
    "frequency" "DeMinimisFrequency" NOT NULL,
    "sourceReference" TEXT NOT NULL,

    CONSTRAINT "DeMinimisCeiling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinimumWageRate" (
    "id" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "region" TEXT NOT NULL,
    "sector" "WageSector" NOT NULL DEFAULT 'NON_AGRICULTURE',
    "dailyRate" DECIMAL(12,2) NOT NULL,
    "wageOrderReference" TEXT NOT NULL,

    CONSTRAINT "MinimumWageRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThirteenthMonthConfig" (
    "id" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "exemptionCeiling" DECIMAL(14,2) NOT NULL,
    "sourceReference" TEXT NOT NULL,

    CONSTRAINT "ThirteenthMonthConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyHoliday" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "holidayType" "HolidayType" NOT NULL,
    "region" TEXT,

    CONSTRAINT "CompanyHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimesheetEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "workDate" TIMESTAMP(3) NOT NULL,
    "timeIn" TIMESTAMP(3),
    "timeOut" TIMESTAMP(3),
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "scheduledHours" DECIMAL(5,2) NOT NULL DEFAULT 8,
    "status" "TimesheetStatus" NOT NULL DEFAULT 'PRESENT',
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "undertimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "regularHours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "overtimeHours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "nightDiffHours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "holidayType" "HolidayType",
    "isRestDay" BOOLEAN NOT NULL DEFAULT false,
    "source" "TimesheetSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimesheetEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollPeriod" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "cutoffStart" TIMESTAMP(3) NOT NULL,
    "cutoffEnd" TIMESTAMP(3) NOT NULL,
    "payDate" TIMESTAMP(3) NOT NULL,
    "periodType" "PeriodType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "payrollPeriodId" TEXT NOT NULL,
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "runNumber" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3),
    "computedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "postedAt" TIMESTAMP(3),
    "postedByUserId" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedByUserId" TEXT,
    "voidReason" TEXT,
    "statutoryRateSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "grossPay" DECIMAL(14,2) NOT NULL,
    "totalStatutoryDeductions" DECIMAL(14,2) NOT NULL,
    "totalOtherDeductions" DECIMAL(14,2) NOT NULL,
    "netPay" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollLineItem" (
    "id" TEXT NOT NULL,
    "payslipId" TEXT NOT NULL,
    "category" "LineItemCategory" NOT NULL,
    "direction" "LineItemDirection" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "quantity" DECIMAL(8,2),
    "rate" DECIMAL(14,4),
    "sourceRef" JSONB,

    CONSTRAINT "PayrollLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "category" "LoanCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "principal" DECIMAL(14,2) NOT NULL,
    "termMonths" INTEGER,
    "installmentAmount" DECIMAL(14,2) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "referenceNumber" TEXT,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "remainingBalance" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanDeduction" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "payrollRunId" TEXT,
    "finalPayRunId" TEXT,
    "cutoffDate" TIMESTAMP(3) NOT NULL,
    "amountDeducted" DECIMAL(14,2) NOT NULL,
    "balanceAfter" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanDeduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveType" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "isStatutory" BOOLEAN NOT NULL DEFAULT false,
    "accrualPolicy" "LeaveAccrualPolicy" NOT NULL DEFAULT 'ANNUAL_GRANT',
    "defaultDaysPerYear" DECIMAL(5,2) NOT NULL,
    "isCarryOverAllowed" BOOLEAN NOT NULL DEFAULT false,
    "maxCarryOverDays" DECIMAL(5,2),
    "isConvertibleToCash" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "entitledDays" DECIMAL(5,2) NOT NULL,
    "usedDays" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "carriedOverDays" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "adjustedDays" DECIMAL(5,2) NOT NULL DEFAULT 0,

    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "daysCount" DECIMAL(5,2) NOT NULL,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "sourceType" "DocumentSourceType" NOT NULL,
    "sourceRunId" TEXT,
    "sourcePeriodStart" TIMESTAMP(3),
    "sourcePeriodEnd" TIMESTAMP(3),
    "employeeId" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedByUserId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "supersedesId" TEXT,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contractor" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tin" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "atcCode" TEXT NOT NULL,
    "defaultEwtRate" DECIMAL(6,4) NOT NULL,
    "isVatRegistered" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContractorStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorPayment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "paymentNumber" INTEGER NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "grossAmount" DECIMAL(14,2) NOT NULL,
    "ewtRate" DECIMAL(6,4) NOT NULL,
    "ewtAmount" DECIMAL(14,2) NOT NULL,
    "netAmount" DECIMAL(14,2) NOT NULL,
    "invoiceReference" TEXT,
    "status" "ContractorPaymentStatus" NOT NULL DEFAULT 'DRAFT',
    "postedAt" TIMESTAMP(3),
    "postedByUserId" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedByUserId" TEXT,
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,

    CONSTRAINT "ContractorPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinalPayRun" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "finalPayNumber" INTEGER NOT NULL,
    "status" "FinalPayRunStatus" NOT NULL DEFAULT 'DRAFT',
    "separationDate" TIMESTAMP(3) NOT NULL,
    "separationCategory" "SeparationCategory" NOT NULL,
    "computedAt" TIMESTAMP(3),
    "computedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "postedAt" TIMESTAMP(3),
    "postedByUserId" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedByUserId" TEXT,
    "voidReason" TEXT,
    "statutoryRateSnapshot" JSONB,
    "grossFinalPay" DECIMAL(14,2) NOT NULL,
    "totalDeductions" DECIMAL(14,2) NOT NULL,
    "netFinalPay" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinalPayRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinalPayLineItem" (
    "id" TEXT NOT NULL,
    "finalPayRunId" TEXT NOT NULL,
    "category" "FinalPayLineItemCategory" NOT NULL,
    "direction" "LineItemDirection" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "isTaxExempt" BOOLEAN NOT NULL DEFAULT false,
    "sourceRef" JSONB,

    CONSTRAINT "FinalPayLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "CompanyMembership_companyId_idx" ON "CompanyMembership"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMembership_userId_companyId_key" ON "CompanyMembership"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_companyCode_key" ON "Company"("companyCode");

-- CreateIndex
CREATE UNIQUE INDEX "Company_tin_key" ON "Company"("tin");

-- CreateIndex
CREATE INDEX "Company_status_idx" ON "Company"("status");

-- CreateIndex
CREATE INDEX "CompanyBranch_companyId_idx" ON "CompanyBranch"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyBranch_companyId_branchCode_key" ON "CompanyBranch"("companyId", "branchCode");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE INDEX "Employee_companyId_idx" ON "Employee"("companyId");

-- CreateIndex
CREATE INDEX "Employee_branchId_idx" ON "Employee"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_companyId_employeeNumber_key" ON "Employee"("companyId", "employeeNumber");

-- CreateIndex
CREATE INDEX "CompensationRecord_employeeId_effectiveFrom_idx" ON "CompensationRecord"("employeeId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "AllowanceLine_compensationRecordId_idx" ON "AllowanceLine"("compensationRecordId");

-- CreateIndex
CREATE INDEX "SssContributionBracket_effectiveFrom_effectiveTo_idx" ON "SssContributionBracket"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "PhilhealthConfig_effectiveFrom_effectiveTo_idx" ON "PhilhealthConfig"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "PagibigContributionBracket_effectiveFrom_effectiveTo_idx" ON "PagibigContributionBracket"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "BirWithholdingBracket_effectiveFrom_effectiveTo_payPeriodTy_idx" ON "BirWithholdingBracket"("effectiveFrom", "effectiveTo", "payPeriodType");

-- CreateIndex
CREATE INDEX "DeMinimisCeiling_effectiveFrom_effectiveTo_category_idx" ON "DeMinimisCeiling"("effectiveFrom", "effectiveTo", "category");

-- CreateIndex
CREATE INDEX "MinimumWageRate_effectiveFrom_effectiveTo_region_sector_idx" ON "MinimumWageRate"("effectiveFrom", "effectiveTo", "region", "sector");

-- CreateIndex
CREATE INDEX "ThirteenthMonthConfig_effectiveFrom_effectiveTo_idx" ON "ThirteenthMonthConfig"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "CompanyHoliday_companyId_date_idx" ON "CompanyHoliday"("companyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyHoliday_companyId_date_region_key" ON "CompanyHoliday"("companyId", "date", "region");

-- CreateIndex
CREATE INDEX "TimesheetEntry_companyId_workDate_idx" ON "TimesheetEntry"("companyId", "workDate");

-- CreateIndex
CREATE UNIQUE INDEX "TimesheetEntry_employeeId_workDate_key" ON "TimesheetEntry"("employeeId", "workDate");

-- CreateIndex
CREATE INDEX "PayrollPeriod_companyId_idx" ON "PayrollPeriod"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollPeriod_companyId_cutoffStart_cutoffEnd_key" ON "PayrollPeriod"("companyId", "cutoffStart", "cutoffEnd");

-- CreateIndex
CREATE INDEX "PayrollRun_companyId_idx" ON "PayrollRun"("companyId");

-- CreateIndex
CREATE INDEX "PayrollRun_payrollPeriodId_idx" ON "PayrollRun"("payrollPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRun_companyId_runNumber_key" ON "PayrollRun"("companyId", "runNumber");

-- CreateIndex
CREATE INDEX "Payslip_companyId_idx" ON "Payslip"("companyId");

-- CreateIndex
CREATE INDEX "Payslip_employeeId_idx" ON "Payslip"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_payrollRunId_employeeId_key" ON "Payslip"("payrollRunId", "employeeId");

-- CreateIndex
CREATE INDEX "PayrollLineItem_payslipId_idx" ON "PayrollLineItem"("payslipId");

-- CreateIndex
CREATE INDEX "Loan_companyId_idx" ON "Loan"("companyId");

-- CreateIndex
CREATE INDEX "Loan_employeeId_status_idx" ON "Loan"("employeeId", "status");

-- CreateIndex
CREATE INDEX "LoanDeduction_loanId_idx" ON "LoanDeduction"("loanId");

-- CreateIndex
CREATE INDEX "LoanDeduction_payrollRunId_idx" ON "LoanDeduction"("payrollRunId");

-- CreateIndex
CREATE INDEX "LoanDeduction_finalPayRunId_idx" ON "LoanDeduction"("finalPayRunId");

-- CreateIndex
CREATE INDEX "LeaveType_companyId_idx" ON "LeaveType"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveType_companyId_code_key" ON "LeaveType"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_employeeId_leaveTypeId_year_key" ON "LeaveBalance"("employeeId", "leaveTypeId", "year");

-- CreateIndex
CREATE INDEX "LeaveRequest_employeeId_idx" ON "LeaveRequest"("employeeId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_companyId_documentType_idx" ON "GeneratedDocument"("companyId", "documentType");

-- CreateIndex
CREATE INDEX "Contractor_companyId_idx" ON "Contractor"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_companyId_tin_key" ON "Contractor"("companyId", "tin");

-- CreateIndex
CREATE INDEX "ContractorPayment_companyId_idx" ON "ContractorPayment"("companyId");

-- CreateIndex
CREATE INDEX "ContractorPayment_contractorId_idx" ON "ContractorPayment"("contractorId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorPayment_companyId_paymentNumber_key" ON "ContractorPayment"("companyId", "paymentNumber");

-- CreateIndex
CREATE INDEX "FinalPayRun_companyId_idx" ON "FinalPayRun"("companyId");

-- CreateIndex
CREATE INDEX "FinalPayRun_employeeId_idx" ON "FinalPayRun"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "FinalPayRun_companyId_finalPayNumber_key" ON "FinalPayRun"("companyId", "finalPayNumber");

-- CreateIndex
CREATE INDEX "FinalPayLineItem_finalPayRunId_idx" ON "FinalPayLineItem"("finalPayRunId");

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyBranch" ADD CONSTRAINT "CompanyBranch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "CompanyBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompensationRecord" ADD CONSTRAINT "CompensationRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompensationRecord" ADD CONSTRAINT "CompensationRecord_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllowanceLine" ADD CONSTRAINT "AllowanceLine_compensationRecordId_fkey" FOREIGN KEY ("compensationRecordId") REFERENCES "CompensationRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyHoliday" ADD CONSTRAINT "CompanyHoliday_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollLineItem" ADD CONSTRAINT "PayrollLineItem_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "Payslip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanDeduction" ADD CONSTRAINT "LoanDeduction_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanDeduction" ADD CONSTRAINT "LoanDeduction_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanDeduction" ADD CONSTRAINT "LoanDeduction_finalPayRunId_fkey" FOREIGN KEY ("finalPayRunId") REFERENCES "FinalPayRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveType" ADD CONSTRAINT "LeaveType_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contractor" ADD CONSTRAINT "Contractor_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorPayment" ADD CONSTRAINT "ContractorPayment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorPayment" ADD CONSTRAINT "ContractorPayment_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalPayRun" ADD CONSTRAINT "FinalPayRun_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalPayRun" ADD CONSTRAINT "FinalPayRun_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalPayLineItem" ADD CONSTRAINT "FinalPayLineItem_finalPayRunId_fkey" FOREIGN KEY ("finalPayRunId") REFERENCES "FinalPayRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
