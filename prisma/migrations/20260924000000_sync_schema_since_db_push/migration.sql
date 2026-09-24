-- Captures every schema change applied with `prisma db push` since 20260730032240
-- (diff of prisma/schema.prisma at 988e7c1 -> current). Production already has these
-- changes, so baseline it there with `prisma migrate resolve --applied` (see package.json db:baseline).
-- CreateEnum
CREATE TYPE "StatutoryDeductionTiming" AS ENUM ('FIRST_HALF', 'SECOND_HALF', 'SPLIT');

-- CreateEnum
CREATE TYPE "PayPeriodFrequency" AS ENUM ('TWICE_A_MONTH', 'ONCE_A_MONTH_SECOND_HALF', 'ONCE_A_MONTH_FIRST_HALF');

-- CreateEnum
CREATE TYPE "StatutoryDeductionMode" AS ENUM ('TABLE', 'MANUAL');

-- CreateEnum
CREATE TYPE "EmployeeDocumentCategory" AS ENUM ('ATTENDANCE_MEMO', 'WAIVER', 'COACHING_PERFORMANCE', 'LEGAL_CONTRACT', 'MEDICAL_CLEARANCE', 'GOVERNMENT_IDENT', 'OTHER');

-- CreateEnum
CREATE TYPE "AllowanceFrequency" AS ENUM ('DAILY', 'MONTHLY');

-- AlterEnum
ALTER TYPE "EmploymentStatus" ADD VALUE 'RETAINER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TimesheetStatus" ADD VALUE 'LATE_UNDERTIME';
ALTER TYPE "TimesheetStatus" ADD VALUE 'WFH';
ALTER TYPE "TimesheetStatus" ADD VALUE 'NO_WORK';
ALTER TYPE "TimesheetStatus" ADD VALUE 'SICK_LEAVE';
ALTER TYPE "TimesheetStatus" ADD VALUE 'VACATION_LEAVE';

-- AlterEnum
ALTER TYPE "PayrollRunStatus" ADD VALUE 'SUPERSEDED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentType" ADD VALUE 'BIR_ALPHALIST';
ALTER TYPE "DocumentType" ADD VALUE 'BANK_DISBURSEMENT';

-- AlterTable
ALTER TABLE "CompanyMembership" ADD COLUMN     "permissions" JSONB;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "allowancePayFrequency" "PayPeriodFrequency" NOT NULL DEFAULT 'TWICE_A_MONTH',
ADD COLUMN     "attendanceFlexi1WindowEnd" TEXT NOT NULL DEFAULT '10:00',
ADD COLUMN     "attendanceFlexi1WindowStart" TEXT NOT NULL DEFAULT '07:00',
ADD COLUMN     "attendanceLateGracePeriodMinutes" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "attendanceLunchBreakMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "attendanceOtGracePeriodMinutes" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "attendanceStandardTimeIn" TEXT NOT NULL DEFAULT '09:30',
ADD COLUMN     "attendanceStandardTimeOut" TEXT NOT NULL DEFAULT '18:30',
ADD COLUMN     "basicPayFrequency" "PayPeriodFrequency" NOT NULL DEFAULT 'TWICE_A_MONTH',
ADD COLUMN     "cutoff1EndDay" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "cutoff1StartDay" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "cutoff2EndDay" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cutoff2StartDay" INTEGER NOT NULL DEFAULT 16,
ADD COLUMN     "includeOtherCompanyAllowancesInContributions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payDateOffsetDays" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "payScheduleStyle" TEXT NOT NULL DEFAULT 'STANDARD_1_15',
ADD COLUMN     "standardWorkDaysPerMonth" DOUBLE PRECISION NOT NULL DEFAULT 26.0,
ADD COLUMN     "statutoryDeductionTiming" "StatutoryDeductionTiming" NOT NULL DEFAULT 'SECOND_HALF';

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "bankBranch" TEXT,
ADD COLUMN     "bankSplitRule" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "bankSplitValue" DECIMAL(14,2),
ADD COLUMN     "currentAddress" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedByUserId" TEXT,
ADD COLUMN     "deletionReason" TEXT,
ADD COLUMN     "emergencyContactAddress" TEXT,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactNumber" TEXT,
ADD COLUMN     "emergencyContactRelationship" TEXT,
ADD COLUMN     "isDeductPagibig" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isDeductPhilhealth" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isDeductSss" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isDeductWithholdingTax" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isIncludedInAlphalist" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mobileNumber" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "pagibigCustomAmountEe" DECIMAL(14,2),
ADD COLUMN     "pagibigCustomAmountEr" DECIMAL(14,2),
ADD COLUMN     "pagibigDeductionMode" "StatutoryDeductionMode" NOT NULL DEFAULT 'TABLE',
ADD COLUMN     "permanentAddress" TEXT,
ADD COLUMN     "personalEmail" TEXT,
ADD COLUMN     "philhealthCustomAmountEe" DECIMAL(14,2),
ADD COLUMN     "philhealthCustomAmountEr" DECIMAL(14,2),
ADD COLUMN     "philhealthDeductionMode" "StatutoryDeductionMode" NOT NULL DEFAULT 'TABLE',
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "primaryCompanyBankId" TEXT,
ADD COLUMN     "rank" TEXT,
ADD COLUMN     "scheduleType" TEXT,
ADD COLUMN     "secondaryBankAccountNumber" TEXT,
ADD COLUMN     "secondaryBankName" TEXT,
ADD COLUMN     "secondaryCompanyBankId" TEXT,
ADD COLUMN     "sssCustomAmountEe" DECIMAL(14,2),
ADD COLUMN     "sssCustomAmountEr" DECIMAL(14,2),
ADD COLUMN     "sssDeductionMode" "StatutoryDeductionMode" NOT NULL DEFAULT 'TABLE';

-- AlterTable
ALTER TABLE "AllowanceLine" ADD COLUMN     "frequency" "AllowanceFrequency" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "payingCompanyId" TEXT;

-- AlterTable
ALTER TABLE "PayrollRun" ADD COLUMN     "replacesRunId" TEXT,
ADD COLUMN     "supersededAt" TIMESTAMP(3),
ADD COLUMN     "supersededByRunId" TEXT;

-- AlterTable
ALTER TABLE "Payslip" ADD COLUMN     "disbursementBankId" TEXT;

-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "hasNoExpiration" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CompanyBankAccount" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "nickname" TEXT,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "branchName" TEXT,
    "swiftCode" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDocument" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "EmployeeDocumentCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "uploadedById" TEXT,
    "uploadedByName" TEXT,
    "documentDate" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDeletionAudit" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "positionTitle" TEXT NOT NULL,
    "departmentName" TEXT,
    "deletedByUserId" TEXT NOT NULL,
    "deletedByUserName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "hasPayrollHistory" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeDeletionAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllowanceType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllowanceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayslipBankDisbursement" (
    "id" TEXT NOT NULL,
    "payslipId" TEXT NOT NULL,
    "companyBankAccountId" TEXT,
    "employeeBankName" TEXT NOT NULL,
    "employeeAccountNumber" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'PRIMARY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayslipBankDisbursement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyBankAccount_companyId_idx" ON "CompanyBankAccount"("companyId");

-- CreateIndex
CREATE INDEX "EmployeeDocument_employeeId_isDeleted_idx" ON "EmployeeDocument"("employeeId", "isDeleted");

-- CreateIndex
CREATE INDEX "EmployeeDocument_companyId_isDeleted_idx" ON "EmployeeDocument"("companyId", "isDeleted");

-- CreateIndex
CREATE INDEX "EmployeeDocument_category_idx" ON "EmployeeDocument"("category");

-- CreateIndex
CREATE INDEX "EmployeeDeletionAudit_companyId_idx" ON "EmployeeDeletionAudit"("companyId");

-- CreateIndex
CREATE INDEX "EmployeeDeletionAudit_employeeId_idx" ON "EmployeeDeletionAudit"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "AllowanceType_name_key" ON "AllowanceType"("name");

-- CreateIndex
CREATE INDEX "PayslipBankDisbursement_payslipId_idx" ON "PayslipBankDisbursement"("payslipId");

-- CreateIndex
CREATE INDEX "PayslipBankDisbursement_companyBankAccountId_idx" ON "PayslipBankDisbursement"("companyBankAccountId");

-- CreateIndex
CREATE INDEX "Employee_companyId_isDeleted_idx" ON "Employee"("companyId", "isDeleted");

-- CreateIndex
CREATE INDEX "AllowanceLine_payingCompanyId_idx" ON "AllowanceLine"("payingCompanyId");

-- CreateIndex
CREATE INDEX "PayrollRun_replacesRunId_idx" ON "PayrollRun"("replacesRunId");

-- CreateIndex
CREATE INDEX "PayrollRun_supersededByRunId_idx" ON "PayrollRun"("supersededByRunId");

-- AddForeignKey
ALTER TABLE "CompanyBankAccount" ADD CONSTRAINT "CompanyBankAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDeletionAudit" ADD CONSTRAINT "EmployeeDeletionAudit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllowanceLine" ADD CONSTRAINT "AllowanceLine_payingCompanyId_fkey" FOREIGN KEY ("payingCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_replacesRunId_fkey" FOREIGN KEY ("replacesRunId") REFERENCES "PayrollRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_disbursementBankId_fkey" FOREIGN KEY ("disbursementBankId") REFERENCES "CompanyBankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayslipBankDisbursement" ADD CONSTRAINT "PayslipBankDisbursement_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "Payslip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayslipBankDisbursement" ADD CONSTRAINT "PayslipBankDisbursement_companyBankAccountId_fkey" FOREIGN KEY ("companyBankAccountId") REFERENCES "CompanyBankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

