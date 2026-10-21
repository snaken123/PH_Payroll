import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getConsolidatedPayables,
  disburseRemittanceCheck,
  getRemittanceChecks,
  voidRemittanceCheck,
  OFFICIAL_STATUTORY_PAYEES,
} from "../remittanceConsolidationService";
import { prisma } from "@/lib/db";
import { StatutoryAgency, StatutoryPaymentStatus, RemittancePaymentMethod } from "@/lib/generated/prisma/enums";
import { Decimal } from "decimal.js";

vi.mock("@/lib/db", () => ({
  prisma: {
    company: {
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    payrollRun: {
      findMany: vi.fn(),
    },
    payslip: {
      findMany: vi.fn(),
    },
    statutoryPaymentRecord: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    loanDeduction: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    payrollPaymentCheck: {
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    companyBankAccount: {
      findUnique: vi.fn(),
    },
    remittanceCheckBatchItem: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

describe("remittanceConsolidationService", () => {
  const companyA = {
    id: "comp-A",
    legalName: "Acme Corp",
    companyCode: "ACME",
    tin: "111-222-333",
    sssEmployerNumber: "03-1234567-8",
    philhealthEmployerNumber: "12-345678901-2",
    pagibigEmployerId: "123456789012",
    bankAccounts: [
      { id: "bank-1", bankName: "BDO", accountNumber: "123456789", nickname: "Payroll Checking" },
    ],
  };

  const companyB = {
    id: "comp-B",
    legalName: "Beta Industries",
    companyCode: "BETA",
    tin: "444-555-666",
    sssEmployerNumber: "03-9999999-9",
    philhealthEmployerNumber: "12-999999999-9",
    pagibigEmployerId: "999999999999",
    bankAccounts: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("OFFICIAL_STATUTORY_PAYEES", () => {
    it("maps all statutory agencies to official legal entities in the Philippines", () => {
      expect(OFFICIAL_STATUTORY_PAYEES[StatutoryAgency.SSS]).toBe("Social Security System");
      expect(OFFICIAL_STATUTORY_PAYEES[StatutoryAgency.PHILHEALTH]).toBe("Philippine Health Insurance Corporation");
      expect(OFFICIAL_STATUTORY_PAYEES[StatutoryAgency.PAGIBIG]).toBe("Home Development Mutual Fund");
      expect(OFFICIAL_STATUTORY_PAYEES[StatutoryAgency.BIR]).toBe("Bureau of Internal Revenue");
    });
  });

  describe("getConsolidatedPayables", () => {
    it("consolidates statutory contributions and loan deductions across companies", async () => {
      vi.mocked(prisma.company.findMany).mockResolvedValue([companyA, companyB] as any);

      // Mock posted payroll runs
      vi.mocked(prisma.payrollRun.findMany).mockResolvedValue([
        {
          id: "run-1",
          companyId: "comp-A",
          runNumber: 1,
          status: "POSTED",
          payrollPeriod: {
            cutoffStart: new Date(Date.UTC(2026, 9, 1)),
            cutoffEnd: new Date(Date.UTC(2026, 9, 15)),
          },
        },
      ] as any);

      // Mock payslips for run-1
      vi.mocked(prisma.payslip.findMany).mockResolvedValue([
        {
          payrollRunId: "run-1",
          lineItems: [
            { category: "SSS_EE", amount: new Decimal("1000.00") },
            { category: "SSS_ER", amount: new Decimal("2000.00") },
            { category: "PHILHEALTH_EE", amount: new Decimal("500.00") },
            { category: "PHILHEALTH_ER", amount: new Decimal("500.00") },
            { category: "PAGIBIG_EE", amount: new Decimal("200.00") },
            { category: "PAGIBIG_ER", amount: new Decimal("200.00") },
            { category: "WITHHOLDING_TAX", amount: new Decimal("1500.00") },
          ],
        },
      ] as any);

      vi.mocked(prisma.statutoryPaymentRecord.findMany).mockResolvedValue([]);

      // Mock loan deductions for SSS and Pag-IBIG
      vi.mocked(prisma.loanDeduction.findMany).mockResolvedValue([
        {
          id: "deduct-sss-1",
          amountDeducted: new Decimal("750.00"),
          cutoffDate: new Date(Date.UTC(2026, 9, 15)),
          remittanceStatus: StatutoryPaymentStatus.UNPAID,
          remittanceCheckNumber: null,
          remittanceReference: null,
          loan: {
            category: "SSS_LOAN",
            name: "SSS Salary Loan",
            referenceNumber: "SL-9988",
            employeeId: "emp-1",
            employee: {
              lastName: "Dela Cruz",
              firstName: "Juan",
              employeeNumber: "EMP001",
              sssNumber: "34-1234567-1",
              pagibigNumber: "1212-3434-5656",
            },
            company: companyA,
          },
          payrollRun: {
            runNumber: 1,
            payrollPeriod: {
              cutoffStart: new Date(Date.UTC(2026, 9, 1)),
              cutoffEnd: new Date(Date.UTC(2026, 9, 15)),
            },
          },
          finalPayRun: null,
        },
      ] as any);

      const result = await getConsolidatedPayables({ year: 2026, month: 10 });

      expect(result.items.length).toBe(5); // SSS, PHIC, PAGIBIG, BIR contributions + 1 SSS Loan

      // Check SSS contribution item
      const sssItem = result.items.find((i) => i.agency === StatutoryAgency.SSS && i.itemType === "CONTRIBUTION");
      expect(sssItem).toBeDefined();
      expect(sssItem?.totalAmount).toBe(3000); // 1000 EE + 2000 ER
      expect(sssItem?.status).toBe(StatutoryPaymentStatus.UNPAID);

      // Check SSS Loan item
      const sssLoanItem = result.items.find((i) => i.itemType === "LOAN");
      expect(sssLoanItem).toBeDefined();
      expect(sssLoanItem?.totalAmount).toBe(750);
      expect(sssLoanItem?.employeeName).toBe("Dela Cruz, Juan");

      // Verify metrics
      expect(result.metrics.grandTotalPending).toBe(3000 + 1000 + 400 + 1500 + 750);
      expect(result.metrics.sssPending).toBe(3000 + 750);
      expect(result.metrics.philhealthPending).toBe(1000);
      expect(result.metrics.pagibigPending).toBe(400);
      expect(result.metrics.birPending).toBe(1500);
      expect(result.metrics.pendingCount).toBe(5);
    });
  });

  describe("disburseRemittanceCheck", () => {
    it("successfully creates a check and tags statutory contribution records to PAID", async () => {
      vi.mocked(prisma.company.findUniqueOrThrow).mockResolvedValue(companyA as any);
      vi.mocked(prisma.companyBankAccount.findUnique).mockResolvedValue(companyA.bankAccounts[0] as any);

      vi.mocked(prisma.payrollPaymentCheck.create).mockResolvedValue({
        id: "check-101",
        checkNumber: "CHK-000991",
        amount: new Decimal("3000.00"),
        status: "ISSUED",
        payee: "Social Security System",
      } as any);

      vi.mocked(prisma.statutoryPaymentRecord.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.statutoryPaymentRecord.create).mockResolvedValue({
        id: "stat-rec-1",
        status: StatutoryPaymentStatus.PAID,
      } as any);

      const check = await disburseRemittanceCheck({
        companyId: "comp-A",
        agency: StatutoryAgency.SSS,
        checkNumber: "CHK-000991",
        checkDate: "2026-10-20",
        bankAccountId: "bank-1",
        referenceNumber: "PRN-202610-00123",
        notes: "October SSS regular contribution check",
        issuedByUserId: "user-liaison-1",
        items: [
          {
            itemType: "CONTRIBUTION",
            id: "contrib_key_1",
            amount: 3000,
            payrollRunId: "run-1",
            periodYear: 2026,
            periodMonth: 10,
            eeAmount: 1000,
            erAmount: 2000,
          },
        ],
      });

      expect(prisma.payrollPaymentCheck.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: "comp-A",
            checkNumber: "CHK-000991",
            sourceType: "STATUTORY_REMITTANCE",
            payee: "Social Security System",
          }),
        })
      );

      expect(prisma.statutoryPaymentRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: "comp-A",
            agency: StatutoryAgency.SSS,
            status: StatutoryPaymentStatus.PAID,
            checkNumber: "CHK-000991",
            referenceNumber: "PRN-202610-00123",
          }),
        })
      );

      expect(prisma.remittanceCheckBatchItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            checkId: "check-101",
            companyId: "comp-A",
            agency: StatutoryAgency.SSS,
            itemType: "CONTRIBUTION",
          }),
        })
      );

      expect(check.id).toBe("check-101");
    });

    it("successfully creates a check and tags loan deductions to PAID", async () => {
      vi.mocked(prisma.company.findUniqueOrThrow).mockResolvedValue(companyA as any);

      vi.mocked(prisma.payrollPaymentCheck.create).mockResolvedValue({
        id: "check-102",
        checkNumber: "CHK-000992",
        amount: new Decimal("750.00"),
        status: "ISSUED",
        payee: "Social Security System",
      } as any);

      vi.mocked(prisma.loanDeduction.update).mockResolvedValue({
        id: "deduct-sss-1",
        remittanceStatus: StatutoryPaymentStatus.PAID,
      } as any);

      await disburseRemittanceCheck({
        companyId: "comp-A",
        agency: StatutoryAgency.SSS,
        checkNumber: "CHK-000992",
        checkDate: "2026-10-20",
        referenceNumber: "PRN-LOANS-7788",
        issuedByUserId: "user-liaison-1",
        items: [
          {
            itemType: "LOAN",
            id: "deduct-sss-1",
            loanDeductionId: "deduct-sss-1",
            amount: 750,
            description: "SSS Salary Loan Juan Dela Cruz",
          },
        ],
      });

      expect(prisma.loanDeduction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "deduct-sss-1" },
          data: expect.objectContaining({
            remittanceStatus: StatutoryPaymentStatus.PAID,
            remittanceCheckNumber: "CHK-000992",
            remittanceReference: "PRN-LOANS-7788",
          }),
        })
      );

      expect(prisma.remittanceCheckBatchItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            checkId: "check-102",
            itemType: "LOAN",
            loanDeductionId: "deduct-sss-1",
          }),
        })
      );
    });

    it("throws error if items array is empty", async () => {
      await expect(
        disburseRemittanceCheck({
          companyId: "comp-A",
          agency: StatutoryAgency.SSS,
          checkNumber: "CHK-000999",
          checkDate: "2026-10-20",
          referenceNumber: "REF-001",
          items: [],
        })
      ).rejects.toThrow("No remittance items selected for disbursement");
    });
  });

  describe("voidRemittanceCheck", () => {
    it("voids the check and reverts linked statutory payment records and loan deductions to UNPAID", async () => {
      vi.mocked(prisma.payrollPaymentCheck.findUniqueOrThrow).mockResolvedValue({
        id: "check-101",
        status: "ISSUED",
        remittanceBatchItems: [
          {
            id: "batch-1",
            statutoryPaymentRecordId: "stat-rec-1",
            loanDeductionId: null,
          },
          {
            id: "batch-2",
            statutoryPaymentRecordId: null,
            loanDeductionId: "deduct-1",
          },
        ],
      } as any);

      vi.mocked(prisma.payrollPaymentCheck.update).mockResolvedValue({
        id: "check-101",
        status: "VOID",
      } as any);

      await voidRemittanceCheck("check-101");

      expect(prisma.statutoryPaymentRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "stat-rec-1" },
          data: expect.objectContaining({
            status: StatutoryPaymentStatus.UNPAID,
            paidAmount: null,
            checkNumber: null,
          }),
        })
      );

      expect(prisma.loanDeduction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "deduct-1" },
          data: expect.objectContaining({
            remittanceStatus: StatutoryPaymentStatus.UNPAID,
            remittanceCheckNumber: null,
          }),
        })
      );

      expect(prisma.payrollPaymentCheck.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "check-101" },
          data: { status: "VOID" },
        })
      );
    });
  });
});
