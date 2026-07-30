-- CreateEnum
CREATE TYPE "LoanDeductionFrequency" AS ENUM ('EVERY_CUTOFF', 'MONTHLY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LoanStatus" ADD VALUE 'PENDING_APPROVAL';
ALTER TYPE "LoanStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedByUserId" TEXT,
ADD COLUMN     "deductionFrequency" "LoanDeductionFrequency" NOT NULL DEFAULT 'EVERY_CUTOFF',
ADD COLUMN     "rejectionReason" TEXT;
