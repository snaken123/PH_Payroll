import { describe, it, expect } from "vitest";

interface CompensationRecordStub {
  id: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

function processCompensationDeletion(
  records: CompensationRecordStub[],
  targetId: string
): CompensationRecordStub[] {
  const sorted = [...records].sort((a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime());
  const remaining = sorted.filter((r) => r.id !== targetId);

  if (remaining.length > 0) {
    for (let i = 0; i < remaining.length; i++) {
      const isLatest = i === remaining.length - 1;
      remaining[i].effectiveTo = isLatest ? null : remaining[i + 1].effectiveFrom;
    }
  }

  return remaining;
}

describe("Compensation Rate Deletion & Date Maintenance Engine", () => {
  it("promotes preceding record to active when current active rate is deleted", () => {
    const r1: CompensationRecordStub = { id: "rec-1", effectiveFrom: new Date("2024-01-01"), effectiveTo: new Date("2025-01-01") };
    const r2: CompensationRecordStub = { id: "rec-2", effectiveFrom: new Date("2025-01-01"), effectiveTo: null };

    const result = processCompensationDeletion([r1, r2], "rec-2");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("rec-1");
    expect(result[0].effectiveTo).toBeNull();
  });

  it("adjusts preceding record's effectiveTo when middle historical rate is deleted", () => {
    const r1: CompensationRecordStub = { id: "rec-1", effectiveFrom: new Date("2024-01-01"), effectiveTo: new Date("2025-01-01") };
    const r2: CompensationRecordStub = { id: "rec-2", effectiveFrom: new Date("2025-01-01"), effectiveTo: new Date("2026-01-01") };
    const r3: CompensationRecordStub = { id: "rec-3", effectiveFrom: new Date("2026-01-01"), effectiveTo: null };

    const result = processCompensationDeletion([r1, r2, r3], "rec-2");

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("rec-1");
    expect(result[0].effectiveTo?.toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(result[1].id).toBe("rec-3");
    expect(result[1].effectiveTo).toBeNull();
  });

  it("handles deleting duplicate record on the same date and ensures latest record has effectiveTo: null", () => {
    const r1: CompensationRecordStub = { id: "rec-1", effectiveFrom: new Date("2026-01-01"), effectiveTo: new Date("2026-09-26") };
    const r2: CompensationRecordStub = { id: "rec-2", effectiveFrom: new Date("2026-09-26"), effectiveTo: new Date("2026-09-26") };
    const r3: CompensationRecordStub = { id: "rec-3", effectiveFrom: new Date("2026-09-26"), effectiveTo: null };

    // User deletes the newly created rec-3
    const result = processCompensationDeletion([r1, r2, r3], "rec-3");

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("rec-1");
    expect(result[0].effectiveTo?.toISOString().slice(0, 10)).toBe("2026-09-26");
    expect(result[1].id).toBe("rec-2");
    expect(result[1].effectiveTo).toBeNull();
  });

  it("handles deleting sole compensation record cleanly", () => {
    const r1: CompensationRecordStub = { id: "rec-1", effectiveFrom: new Date("2024-01-01"), effectiveTo: null };

    const result = processCompensationDeletion([r1], "rec-1");

    expect(result).toHaveLength(0);
  });
});
