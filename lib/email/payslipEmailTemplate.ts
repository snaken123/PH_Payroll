export interface PayslipEmailData {
  companyName: string;
  employeeName: string;
  employeeNumber: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  basicPay: number;
  grossPay: number;
  netPay: number;
  totalDeductions: number;
  sssDeduction: number;
  philhealthDeduction: number;
  pagibigDeduction: number;
  withholdingTax: number;
  allowancesTotal: number;
  overtimeTotal: number;
  loansTotal: number;
}

export function generatePayslipHtml(data: PayslipEmailData): string {
  const formatCurrency = (amount: number) =>
    `₱${Number(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payslip - ${data.companyName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #1e3a8a; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0 0; font-size: 13px; color: #93c5fd; }
    .content { padding: 24px; }
    .meta-box { background: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .meta-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
    .meta-label { color: #64748b; font-weight: 500; }
    .meta-value { color: #0f172a; font-weight: 600; }
    .table-section { margin-bottom: 20px; }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-bottom: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
    .item-row { display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; border-bottom: 1px dashed #f1f5f9; }
    .item-label { color: #334155; }
    .item-val { font-weight: 600; color: #0f172a; font-family: monospace; }
    .highlight-card { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0; }
    .highlight-label { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #047857; letter-spacing: 0.5px; }
    .highlight-amount { font-size: 28px; font-weight: 800; color: #065f46; margin: 6px 0 0 0; font-family: monospace; }
    .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${data.companyName}</h1>
      <p>Official Payroll Advice & Confidential Payslip</p>
    </div>

    <div class="content">
      <div class="meta-box">
        <div class="meta-row">
          <span class="meta-label">Employee Name:</span>
          <span class="meta-value">${data.employeeName}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Employee ID:</span>
          <span class="meta-value">${data.employeeNumber}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Pay Period:</span>
          <span class="meta-value">${data.periodStart} to ${data.periodEnd}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Pay Date:</span>
          <span class="meta-value">${data.payDate}</span>
        </div>
      </div>

      <!-- Net Pay Banner -->
      <div class="highlight-card">
        <div class="highlight-label">NET TAKE-HOME PAY</div>
        <div class="highlight-amount">${formatCurrency(data.netPay)}</div>
      </div>

      <!-- Summary Tables -->
      <div style="display: table; width: 100%; border-collapse: collapse;">
        <!-- Earnings -->
        <div class="table-section">
          <div class="section-title">Earnings Breakdown</div>
          <div class="item-row"><span class="item-label">Basic Salary:</span><span class="item-val">${formatCurrency(data.basicPay)}</span></div>
          ${data.overtimeTotal > 0 ? `<div class="item-row"><span class="item-label">Overtime Pay:</span><span class="item-val">${formatCurrency(data.overtimeTotal)}</span></div>` : ""}
          ${data.allowancesTotal > 0 ? `<div class="item-row"><span class="item-label">Allowances:</span><span class="item-val">${formatCurrency(data.allowancesTotal)}</span></div>` : ""}
          <div class="item-row" style="border-bottom: 2px solid #cbd5e1; font-weight: 700;"><span class="item-label" style="font-weight: 700;">TOTAL GROSS PAY:</span><span class="item-val">${formatCurrency(data.grossPay)}</span></div>
        </div>

        <!-- Deductions -->
        <div class="table-section" style="margin-top: 16px;">
          <div class="section-title">Statutory & Other Deductions</div>
          ${data.sssDeduction > 0 ? `<div class="item-row"><span class="item-label">SSS Contribution:</span><span class="item-val">${formatCurrency(data.sssDeduction)}</span></div>` : ""}
          ${data.philhealthDeduction > 0 ? `<div class="item-row"><span class="item-label">PhilHealth Contribution:</span><span class="item-val">${formatCurrency(data.philhealthDeduction)}</span></div>` : ""}
          ${data.pagibigDeduction > 0 ? `<div class="item-row"><span class="item-label">Pag-IBIG Contribution:</span><span class="item-val">${formatCurrency(data.pagibigDeduction)}</span></div>` : ""}
          ${data.withholdingTax > 0 ? `<div class="item-row"><span class="item-label">Withholding Tax (BIR):</span><span class="item-val">${formatCurrency(data.withholdingTax)}</span></div>` : ""}
          ${data.loansTotal > 0 ? `<div class="item-row"><span class="item-label">Loans / Cash Advances:</span><span class="item-val">${formatCurrency(data.loansTotal)}</span></div>` : ""}
          <div class="item-row" style="border-bottom: 2px solid #cbd5e1; font-weight: 700;"><span class="item-label" style="font-weight: 700;">TOTAL DEDUCTIONS:</span><span class="item-val" style="color: #dc2626;">-${formatCurrency(data.totalDeductions)}</span></div>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>This is a system-generated payslip from ${data.companyName}. A PDF copy of your detailed payslip is attached to this email.</p>
      <p>© ${new Date().getFullYear()} ${data.companyName}. Confidential Information.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
