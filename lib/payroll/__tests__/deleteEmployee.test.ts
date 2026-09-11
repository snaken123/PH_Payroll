import { describe, it, expect } from "vitest";
import { deleteEmployeeSchema } from "@/lib/validations/employee";

describe("Employee Deletion & Mandatory Reason Validation", () => {
  it("rejects empty or missing deletion reason", () => {
    const res1 = deleteEmployeeSchema.safeParse({ reason: "" });
    expect(res1.success).toBe(false);

    const res2 = deleteEmployeeSchema.safeParse({});
    expect(res2.success).toBe(false);
  });

  it("rejects deletion reasons shorter than 3 characters", () => {
    const res = deleteEmployeeSchema.safeParse({ reason: "no" });
    expect(res.success).toBe(false);
  });

  it("accepts valid deletion reasons", () => {
    const res = deleteEmployeeSchema.safeParse({ reason: "Created by mistake / Duplicate entry" });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.reason).toBe("Created by mistake / Duplicate entry");
    }
  });

  it("trims whitespace from deletion reasons", () => {
    const res = deleteEmployeeSchema.safeParse({ reason: "   Incorrect profile setup   " });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.reason).toBe("Incorrect profile setup");
    }
  });
});
