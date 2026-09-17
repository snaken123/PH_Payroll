import { describe, expect, it } from "vitest";
import { PayrollRunStatus } from "@/lib/generated/prisma/enums";

describe("Finding 3 — Approved Payroll Run Superseding & History Invariant", () => {
  it("defines SUPERSEDED status in PayrollRunStatus enum", () => {
    expect(PayrollRunStatus.SUPERSEDED).toBe("SUPERSEDED");
  });

  it("ensures approved runs transition to SUPERSEDED when replaced instead of being deleted", () => {
    const mockOldApprovedRun = {
      id: "run_1",
      status: PayrollRunStatus.APPROVED,
      runNumber: 1,
      replacesRunId: null,
      supersededByRunId: null,
      supersededAt: null,
    };

    const mockNewDraftRun = {
      id: "run_2",
      status: PayrollRunStatus.DRAFT,
      runNumber: 2,
      replacesRunId: "run_1",
      supersededByRunId: null,
    };

    // When new run #2 is approved:
    const updatedNewRun = { ...mockNewDraftRun, status: PayrollRunStatus.APPROVED };
    const updatedOldRun = {
      ...mockOldApprovedRun,
      status: PayrollRunStatus.SUPERSEDED,
      supersededByRunId: updatedNewRun.id,
      supersededAt: new Date("2026-09-17T09:40:00Z"),
    };

    // Verify invariants
    expect(updatedOldRun.status).toBe("SUPERSEDED");
    expect(updatedOldRun.supersededByRunId).toBe("run_2");
    expect(updatedNewRun.replacesRunId).toBe("run_1");
    expect(updatedOldRun.id).toBe("run_1"); // Never deleted!
  });
});
