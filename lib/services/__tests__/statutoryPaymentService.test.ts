import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCompanyContributionsSummary,
  tagStatutoryPayment,
} from "../statutoryPaymentService";
import { prisma } from "@/lib/db";
import { StatutoryAgency, StatutoryPaymentStatus, RemittancePaymentMethod } from "@/lib/generated/prisma/enums";
import { Decimal } from "decimal.js";

vi.mock("@/lib/db", () => ({
  prisma: {
    company: {
      findUniqueOrThrow: vi.fn(),
    },
    payrollRun: {
      findMany: vi.fn(),
    },
    payslip: {
      findMany: vi.fn(),
    },
    companyBankAccount: {
      findUnique: vi.fn(),
    },
    statutoryPaymentRecord: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    payrollPaymentCheck: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("statutoryPaymentService", () => {
  const companyId = "company-123";
  const runId = "run-001";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCompanyContributionsSummary", () => {
    it("derives exact agency amounts from payroll line items", async () => {
      vi.mocked(prisma.company.findUniqueOrThrow).mockResolvedValue({
        id: companyId,
        legalName: "Test Company Inc.",
        companyCode: "TC",
        tin: "123-456-789",
      } as any);

      vi.mocked(prisma.payrollRun.findMany).mockResolvedValue([
        {
          id: runId,
          runNumber: 1,
          status: "POSTED",
          payrollPeriod: {
            cutoffStart: new Date("2026-09-26"),
            cutoffEnd: new Date("2026-10-10"),
            payDate: new Date("2026-10-15"),
          },
        },
      ] as any);

      vi.mocked(prisma.payslip.findMany).mockResolvedValue([
        {
          payrollRunId: runId,
          lineItems: [
            { category: "SSS_EE", amount: new Decimal("425.00") },
            { category: "SSS_ER", amount: new Decimal("865.00") },
            { category: "PHILHEALTH_EE", amount: new Decimal("213.85") },
            { category: "PHILHEALTH_ER", amount: new Decimal("213.85") },
            { category: "PAGIBIG_EE", amount: new Decimal("100.00") },
            { category: "PAGIBIG_ER", amount: new Decimal("100.00") },
            { category: "WITHHOLDING_TAX", amount: new Decimal("500.00") },
          ],
        },
      ] as any);

      vi.mocked(prisma.statutoryPaymentRecord.findMany).mockResolvedValue([
        {
          id: "rec-1",
          companyId,
          agency: StatutoryAgency.SSS,
          payrollRunId: runId,
          periodYear: 2026,
          periodMonth: 10,
          status: StatutoryPaymentStatus.PAID,
          paidAmount: new Decimal("1290.00"),
          checkNumber: "00129",
          referenceNumber: "SBR-888",
          paymentDate: new Date("2026-10-15"),
        },
      ] as any);

      const summary = await getCompanyContributionsSummary(companyId, { payrollRunId: runId });

      expect(summary.groups).toHaveLength(1);
      const group = summary.groups[0];
      expect(group.runNumber).toBe(1);

      // Check SSS
      const sss = group.agencies.find((a) => a.agency === StatutoryAgency.SSS);
      expect(sss).toBeDefined();
      expect(sss!.eeAmount).toBe(425);
      expect(sss!.erAmount).toBe(865);
      expect(sss!.totalAmount).toBe(1290);
      expect(sss!.status).toBe(StatutoryPaymentStatus.PAID);
      expect(sss!.checkNumber).toBe("00129");

      // Check PhilHealth (not tagged yet -> defaults to UNPAID)
      const phic = group.agencies.find((a) => a.agency === StatutoryAgency.PHILHEALTH);
      expect(phic).toBeDefined();
      expect(phic!.eeAmount).toBe(213.85);
      expect(phic!.erAmount).toBe(213.85);
      expect(phic!.totalAmount).toBe(427.7);
      expect(phic!.status).toBe(StatutoryPaymentStatus.UNPAID);

      // Check Pag-IBIG
      const pagibig = group.agencies.find((a) => a.agency === StatutoryAgency.PAGIBIG);
      expect(pagibig).toBeDefined();
      expect(pagibig!.totalAmount).toBe(200);

      // Check BIR
      const bir = group.agencies.find((a) => a.agency === StatutoryAgency.BIR);
      expect(bir).toBeDefined();
      expect(bir!.totalAmount).toBe(500);

      // Total due across all 4 agencies
      // 1290 + 427.70 + 200 + 500 = 2417.70
      expect(group.totalDue).toBe(2417.7);
      expect(group.totalPaid).toBe(1290);
      expect(group.totalPending).toBe(1127.7);
    });
  });

  describe("tagStatutoryPayment", () => {
    it("creates a new payment record when none exists", async () => {
      vi.mocked(prisma.statutoryPaymentRecord.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.statutoryPaymentRecord.create).mockResolvedValue({
        id: "rec-new",
        agency: StatutoryAgency.PHILHEALTH,
        status: StatutoryPaymentStatus.PAID,
      } as any);

      const result = await tagStatutoryPayment({
        companyId,
        agency: StatutoryAgency.PHILHEALTH,
        payrollRunId: runId,
        periodMonth: 10,
        periodYear: 2026,
        computedEeAmount: 213.85,
        computedErAmount: 213.85,
        computedTotalAmount: 427.7,
        status: StatutoryPaymentStatus.PAID,
        checkNumber: "00991",
        paymentMethod: RemittancePaymentMethod.CHECK,
        referenceNumber: "SPA-991823",
      });

      expect(prisma.statutoryPaymentRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId,
            agency: StatutoryAgency.PHILHEALTH,
            status: StatutoryPaymentStatus.PAID,
            checkNumber: "00991",
            referenceNumber: "SPA-991823",
          }),
        })
      );
      expect(result.id).toBe("rec-new");
    });

    it("updates existing payment record when already present", async () => {
      vi.mocked(prisma.statutoryPaymentRecord.findFirst).mockResolvedValue({
        id: "rec-existing",
        companyId,
      } as any);

      vi.mocked(prisma.statutoryPaymentRecord.update).mockResolvedValue({
        id: "rec-existing",
        status: StatutoryPaymentStatus.PAID,
        checkNumber: "00992",
      } as any);

      const result = await tagStatutoryPayment({
        companyId,
        agency: StatutoryAgency.PHILHEALTH,
        payrollRunId: runId,
        periodMonth: 10,
        periodYear: 2026,
        computedEeAmount: 213.85,
        computedErAmount: 213.85,
        computedTotalAmount: 427.7,
        status: StatutoryPaymentStatus.PAID,
        checkNumber: "00992",
      });

      expect(prisma.statutoryPaymentRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "rec-existing" },
          data: expect.objectContaining({
            checkNumber: "00992",
            status: StatutoryPaymentStatus.PAID,
          }),
        })
      );
      expect(result.id).toBe("rec-existing");
    });
  });
});
