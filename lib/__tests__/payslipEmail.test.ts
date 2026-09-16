import { describe, it, expect } from "vitest";
import { generatePayslipHtml } from "@/lib/email/payslipEmailTemplate";
import { sendResendEmail } from "@/lib/email/resend";

describe("Resend Email Payslip Distribution Module", () => {
  it("generates formatted HTML payslip with earnings and deductions", () => {
    const html = generatePayslipHtml({
      companyName: "Acme Corporation Philippines",
      employeeName: "Juan Dela Cruz",
      employeeNumber: "EMP-2026-001",
      periodStart: "2026-02-01",
      periodEnd: "2026-02-15",
      payDate: "2026-02-20",
      basicPay: 25000,
      grossPay: 28500,
      netPay: 24150.5,
      totalDeductions: 4349.5,
      sssDeduction: 1350,
      philhealthDeduction: 625,
      pagibigDeduction: 200,
      withholdingTax: 2174.5,
      allowancesTotal: 3500,
      overtimeTotal: 0,
      loansTotal: 0,
    });

    expect(html).toContain("Acme Corporation Philippines");
    expect(html).toContain("Juan Dela Cruz");
    expect(html).toContain("EMP-2026-001");
    expect(html).toContain("₱24,150.50"); // Net pay
    expect(html).toContain("₱28,500.00"); // Gross pay
    expect(html).toContain("₱1,350.00"); // SSS
    expect(html).toContain("₱2,174.50"); // Tax
  });

  it("handles email simulation mode when RESEND_API_KEY is not set", async () => {
    // Force empty API key for test
    const originalKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = "";

    const res = await sendResendEmail({
      to: "test@example.com",
      subject: "Test Payslip",
      html: "<p>Test</p>",
    });

    expect(res.success).toBe(true);
    expect(res.simulated).toBe(true);

    process.env.RESEND_API_KEY = originalKey;
  });
});
