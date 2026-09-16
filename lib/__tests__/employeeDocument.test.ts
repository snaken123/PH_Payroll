import { describe, it, expect } from "vitest";
import { createEmployeeDocumentSchema } from "@/lib/validations/employeeDocument";
import { EmployeeDocumentCategory } from "@/lib/generated/prisma/enums";

describe("201 File Employee Document Validation Schemas", () => {
  it("validates a complete Attendance Memo document payload", () => {
    const payload = {
      title: "Notice to Explain - Feb 2026 Attendance",
      category: EmployeeDocumentCategory.ATTENDANCE_MEMO,
      description: "Employee incurred 3 unexcused tardiness occurrences in pay period",
      fileUrl: "data:application/pdf;base64,JVBERi0xLjQ...",
      fileName: "nte_attendance_feb2026.pdf",
      fileSize: 1048576,
      mimeType: "application/pdf",
      documentDate: "2026-02-15",
    };

    const parsed = createEmployeeDocumentSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.title).toBe("Notice to Explain - Feb 2026 Attendance");
      expect(parsed.data.category).toBe(EmployeeDocumentCategory.ATTENDANCE_MEMO);
      expect(parsed.data.fileSize).toBe(1048576);
    }
  });

  it("validates a Waiver and Quitclaim document payload", () => {
    const payload = {
      title: "Signed Release Waiver & Quitclaim",
      category: EmployeeDocumentCategory.WAIVER,
      description: "Final pay clearance liability release and quitclaim form signed",
      fileUrl: "data:image/png;base64,iVBORw0KGgo...",
      fileName: "quitclaim_signed.png",
      fileSize: 524288,
      mimeType: "image/png",
    };

    const parsed = createEmployeeDocumentSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it("defaults to OTHER category if category is omitted", () => {
    const payload = {
      title: "Employee Certificate of Training",
      fileUrl: "data:application/pdf;base64,JVBER...",
      fileName: "training_cert.pdf",
      fileSize: 204800,
    };

    const parsed = createEmployeeDocumentSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.category).toBe(EmployeeDocumentCategory.OTHER);
    }
  });

  it("rejects document upload with missing title or fileUrl", () => {
    const invalidPayload = {
      title: "",
      category: EmployeeDocumentCategory.COACHING_PERFORMANCE,
      fileName: "coaching.pdf",
      fileSize: 1000,
    };

    const parsed = createEmployeeDocumentSchema.safeParse(invalidPayload);
    expect(parsed.success).toBe(false);
  });
});
