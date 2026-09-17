# Antigravity Project Context & System Memory — PH Payroll

This document defines the authoritative system rules, context, and project memory for PH Payroll (`C:\Code\PH_Payroll`).

---

## Core System Architecture & Tech Stack

- **Framework**: Next.js 16.2.10 (App Router), React 19.2.4, TypeScript 5
- **Database & ORM**: PostgreSQL (Neon Serverless DB), Prisma 7.8.0 (`@prisma/adapter-pg`)
- **Auth**: NextAuth 4.24.14 (JWT Credentials provider)
- **UI & Styling**: Tailwind CSS 4, `@base-ui/react`, lucide-react icons, sonner toasts
- **Payroll & Reports**: Decimal.js, `@react-pdf/renderer` PDF generation, Resend Email API (`RESEND_API_KEY`)
- **Testing**: Vitest 4.1.9 (`27/27` test suites passing, `142/142` tests)

---

## Authoritative Business & Company Rules

1. **26 Standard Work Days Per Month**:
   - All company daily-to-monthly salary conversions and prorations default to **26.0 days** (`Company.standardWorkDaysPerMonth = 26.0`).
   - `estimateDailyRateEquivalent` and `estimateMonthlyEquivalentCompensation` use a 26-day divisor.

2. **9:30 AM Starting Office Hours**:
   - Standard office hours time-in defaults to **09:30 AM** (`attendanceStandardTimeIn = "09:30"`).
   - Standard office hours time-out defaults to **06:30 PM** (`attendanceStandardTimeOut = "18:30"`).

3. **Cross-Company Allowances (Non-Root Company Allowances)**:
   - **Statutory Contribution Exemption**: Allowances paid by a non-root company (`payingCompanyId !== currentCompanyId`) are excluded from SSS, PhilHealth, and Pag-IBIG monthly equivalent contribution bases (`estimateMonthlyEquivalent.ts`).
   - **Tax-Exempt Status**: Allowances paid by a non-root company are treated as 100% non-taxable (`nonTaxableAmount = amount`) in the paying company's withholding tax computation (`engine.ts`).

---

## Key Modules Implemented

1. **Employee 201 File Dossier Module**:
   - `/dashboard/employees/[id]` stores personal profile, contact email/mobile, residential addresses, and emergency next-of-kin details.
   - Updated via `EditEmployeeProfileDialog` ("Update 201 File").

2. **201 File Digital Document Vault & Records**:
   - Dedicated card on employee 201 detail page for uploading and managing employee lifecycle documents up to 10MB.
   - **Categories**: Attendance Memos / NTEs, Waivers & Quitclaims, Coaching & Performance Reviews, Legal Contracts, Medical Clearances, Government IDs, Other.
   - Supported via `app/api/employees/[id]/documents`.

3. **Resend Email Payslip Distribution**:
   - Modal dialog on main dashboard overview (`/dashboard`) via **"Send Email Payslips"** button (`SendEmailPayslipsDialog`).
   - Filters only **APPROVED** and **POSTED** payroll runs.
   - Dispatches responsive HTML email payslips with attached PDF reports via Resend API (`RESEND_API_KEY` in `.env`).

4. **Multi-Tenant Isolation**:
   - Enforced across all API routes via `getTenantContext()`, `withCompanyScope(ctx.companyId)`, and `assertCompanyId(ctx, companyId)`.
