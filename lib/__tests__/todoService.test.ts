import { describe, it, expect, vi } from "vitest";
import { getSuperUserTodoList } from "../services/todoService";
import { prisma } from "@/lib/db";

// Mock @/lib/db
vi.mock("@/lib/db", () => ({
  prisma: {
    payrollRun: { findMany: vi.fn() },
    loan: { findMany: vi.fn() },
    leaveRequest: { findMany: vi.fn() },
    finalPayRun: { findMany: vi.fn() },
    contractorPayment: { findMany: vi.fn() },
  },
}));

describe("todoService - Super User To-Do List", () => {
  it("fetches and correctly structures pending items", async () => {
    const mockNow = new Date("2026-09-28T10:00:00Z");

    vi.mocked(prisma.payrollRun.findMany).mockResolvedValue([
      {
        id: "pr-1",
        runNumber: "PR-001",
        status: "PENDING_APPROVAL",
        companyId: "comp-1",
        createdAt: mockNow,
        payrollPeriod: {
          cutoffStart: new Date("2026-09-01"),
          cutoffEnd: new Date("2026-09-15"),
          payDate: new Date("2026-09-20"),
        },
        _count: { payslips: 15 },
      } as any,
    ]);

    vi.mocked(prisma.loan.findMany).mockResolvedValue([
      {
        id: "loan-1",
        category: "CASH_ADVANCE",
        name: "Emergency CA",
        principal: 5000,
        termMonths: 1,
        startDate: new Date("2026-09-25"),
        status: "PENDING_APPROVAL",
        createdAt: mockNow,
        employee: {
          firstName: "Juan",
          lastName: "Dela Cruz",
          employeeNumber: "EMP-001",
          positionTitle: "Developer",
        },
      } as any,
    ]);

    vi.mocked(prisma.leaveRequest.findMany).mockResolvedValue([]);
    vi.mocked(prisma.finalPayRun.findMany).mockResolvedValue([]);
    vi.mocked(prisma.contractorPayment.findMany).mockResolvedValue([]);

    const result = await getSuperUserTodoList("comp-1");

    expect(result.counts.total).toBe(2);
    expect(result.counts.payroll).toBe(1);
    expect(result.counts.loans).toBe(1);
    expect(result.counts.leave).toBe(0);

    expect(result.items[0].title).toContain("Payroll Run #PR-001");
    expect(result.items[0].category).toBe("PAYROLL");
    expect(result.items[1].title).toContain("Cash Advance Application — Dela Cruz, Juan");
    expect(result.items[1].category).toBe("LOAN");
  });
});

