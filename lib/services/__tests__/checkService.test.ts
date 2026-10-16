import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createPayrollCheck,
  getPayrollRunChecks,
  updatePayrollCheck,
  deleteOrVoidPayrollCheck,
  listCompanyChecks,
} from "../checkService";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    payrollRun: {
      findUnique: vi.fn(),
    },
    companyBankAccount: {
      findUnique: vi.fn(),
    },
    payrollPaymentCheck: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe("checkService", () => {
  const companyId = "company-123";
  const payrollRunId = "run-456";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createPayrollCheck", () => {
    it("throws an error if payroll run not found for company", async () => {
      vi.mocked(prisma.payrollRun.findUnique).mockResolvedValue(null as any);

      await expect(
        createPayrollCheck({
          companyId,
          payrollRunId,
          checkNumber: "CHK-001",
          checkDate: new Date(),
          amount: 50000,
        })
      ).rejects.toThrow("Payroll run not found for this company");
    });

    it("creates payroll payment check with resolved bank details", async () => {
      vi.mocked(prisma.payrollRun.findUnique).mockResolvedValue({
        id: payrollRunId,
        companyId,
      } as any);

      vi.mocked(prisma.companyBankAccount.findUnique).mockResolvedValue({
        id: "bank-1",
        bankName: "BDO",
        accountNumber: "123456",
      } as any);

      vi.mocked(prisma.payrollPaymentCheck.create).mockResolvedValue({
        id: "chk-1",
        checkNumber: "CHK-001",
        amount: 50000,
        bankName: "BDO",
      } as any);

      const result = await createPayrollCheck({
        companyId,
        payrollRunId,
        checkNumber: "CHK-001",
        checkDate: "2026-10-15",
        amount: 50000,
        bankAccountId: "bank-1",
        payee: "Payroll Payout",
      });

      expect(prisma.payrollPaymentCheck.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId,
            payrollRunId,
            checkNumber: "CHK-001",
            bankName: "BDO",
            payee: "Payroll Payout",
            status: "ISSUED",
          }),
        })
      );
      expect(result.id).toBe("chk-1");
    });
  });

  describe("getPayrollRunChecks", () => {
    it("queries checks for specific run and company", async () => {
      vi.mocked(prisma.payrollPaymentCheck.findMany).mockResolvedValue([
        { id: "chk-1", checkNumber: "CHK-001" },
      ] as any);

      const checks = await getPayrollRunChecks(companyId, payrollRunId);
      expect(prisma.payrollPaymentCheck.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId, payrollRunId },
        })
      );
      expect(checks).toHaveLength(1);
    });
  });

  describe("updatePayrollCheck", () => {
    it("updates check fields properly", async () => {
      vi.mocked(prisma.payrollPaymentCheck.findUnique).mockResolvedValue({
        id: "chk-1",
        companyId,
        bankName: "BDO",
      } as any);

      vi.mocked(prisma.payrollPaymentCheck.update).mockResolvedValue({
        id: "chk-1",
        checkNumber: "CHK-002",
        status: "CLEARED",
      } as any);

      const updated = await updatePayrollCheck({
        companyId,
        checkId: "chk-1",
        checkNumber: "CHK-002",
        status: "CLEARED",
      });

      expect(prisma.payrollPaymentCheck.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "chk-1" },
          data: expect.objectContaining({
            checkNumber: "CHK-002",
            status: "CLEARED",
          }),
        })
      );
      expect(updated.status).toBe("CLEARED");
    });
  });

  describe("deleteOrVoidPayrollCheck", () => {
    it("sets status to VOID by default", async () => {
      vi.mocked(prisma.payrollPaymentCheck.findUnique).mockResolvedValue({
        id: "chk-1",
        companyId,
      } as any);

      await deleteOrVoidPayrollCheck(companyId, "chk-1", "VOID");

      expect(prisma.payrollPaymentCheck.update).toHaveBeenCalledWith({
        where: { id: "chk-1" },
        data: { status: "VOID" },
      });
    });

    it("deletes record when action is DELETE", async () => {
      vi.mocked(prisma.payrollPaymentCheck.findUnique).mockResolvedValue({
        id: "chk-1",
        companyId,
      } as any);

      await deleteOrVoidPayrollCheck(companyId, "chk-1", "DELETE");

      expect(prisma.payrollPaymentCheck.delete).toHaveBeenCalledWith({
        where: { id: "chk-1" },
      });
    });
  });

  describe("listCompanyChecks", () => {
    it("aggregates total amount and counts", async () => {
      vi.mocked(prisma.payrollPaymentCheck.findMany).mockResolvedValue([
        { id: "chk-1", amount: 25000, status: "ISSUED" },
        { id: "chk-2", amount: 15000, status: "CLEARED" },
      ] as any);
      vi.mocked(prisma.payrollPaymentCheck.count).mockResolvedValue(2);

      const result = await listCompanyChecks(companyId, { status: "ALL" });

      expect(result.totalCount).toBe(2);
      expect(result.totalAmount).toBe(40000);
      expect(result.checks).toHaveLength(2);
    });
  });
});
