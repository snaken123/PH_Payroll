export interface PermissionItem {
  key: string;
  label: string;
  description: string;
}

export interface PermissionCategory {
  id: string;
  title: string;
  iconName: string;
  description: string;
  items: PermissionItem[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: "overview",
    title: "Dashboard & Overview Access",
    iconName: "LayoutDashboard",
    description: "Access company summary dashboard, KPI metric cards, and operational shortcuts",
    items: [
      {
        key: "overview.view",
        label: "View Dashboard Overview Page",
        description: "Access the main company metrics overview and operational highlights page",
      },
    ],
  },
  {
    id: "employee",
    title: "Employee / 201 File Management",
    iconName: "Users",
    description: "Manage employee master records, personal details, documents, and compensation",
    items: [
      {
        key: "employee.view_info",
        label: "View Employee Directory & Basic 201 Info",
        description: "Access employee names, contact info, job title, and department",
      },
      {
        key: "employee.view_compensation",
        label: "View Salary & Pay Rates",
        description: "Access basic salary rates, wage basis, allowances, and bank details",
      },
      {
        key: "employee.upload_docs",
        label: "Upload & View 201 Documents",
        description: "Upload and download contracts, IDs, certificates, and HR documents",
      },
      {
        key: "employee.manage",
        label: "Create, Edit & Delete Employees",
        description: "Add new employees, modify profile details, separate or delete roster records",
      },
    ],
  },
  {
    id: "attendance",
    title: "Attendance & Timekeeping",
    iconName: "Clock",
    description: "Manage shift schedules, time-in/out records, tardiness, and overtime facts",
    items: [
      {
        key: "attendance.view",
        label: "View Attendance Grid & Records",
        description: "Access the spreadsheet cutoff grid and daily time cards",
      },
      {
        key: "attendance.manage",
        label: "Edit & Override Timesheets",
        description: "Modify daily time punches, approve overtime, and generate cutoff defaults",
      },
    ],
  },
  {
    id: "leave",
    title: "Leave Management",
    iconName: "Palmtree",
    description: "Process vacation, sick, and statutory leave applications",
    items: [
      {
        key: "leave.view",
        label: "View Leave Requests & Balances",
        description: "Access leave calendar, balance ledgers, and filed requests",
      },
      {
        key: "leave.manage",
        label: "Approve / Reject Leave Applications",
        description: "Act on leave requests and manage company leave types",
      },
    ],
  },
  {
    id: "loans",
    title: "Loans & Cash Advances",
    iconName: "Banknote",
    description: "Track SSS, Pag-IBIG, company loans, and emergency cash advances",
    items: [
      {
        key: "loans.view",
        label: "View Loans & Amortization Schedules",
        description: "Access active loan ledgers and deduction histories",
      },
      {
        key: "loans.manage",
        label: "Create & Approve Loans / Cash Advances",
        description: "Issue new company loans and set semi-monthly amortization amounts",
      },
    ],
  },
  {
    id: "payroll",
    title: "Payroll Computation & Processing",
    iconName: "Wallet",
    description: "Calculate semi-monthly pay periods, statutory deductions, and net pay",
    items: [
      {
        key: "payroll.compute",
        label: "Compute & Review Draft Payroll Runs",
        description: "Trigger calculations, review payslip previews, and recompute adjustments",
      },
      {
        key: "payroll.approve",
        label: "Approve, Post & Void Payroll Runs",
        description: "Finalize payroll runs, lock period data, or void posted runs",
      },
      {
        key: "payroll.send_payslips",
        label: "Distribute Email Payslips",
        description: "Send official password-protected PDF payslips via Resend email",
      },
    ],
  },
  {
    id: "reports",
    title: "Statutory Tax & Government Reports",
    iconName: "FileText",
    description: "Generate official BIR, SSS, PhilHealth, and Pag-IBIG compliance documents",
    items: [
      {
        key: "reports.view",
        label: "Generate BIR & Government Remittance Reports",
        description: "Export BIR 1601-C, BIR 2316, 2307, Alphalist, SSS R-3, PhilHealth RF-1, and Bank CSVs",
      },
    ],
  },
  {
    id: "contractors",
    title: "Contractors & Freelancers",
    iconName: "Briefcase",
    description: "Manage 1099/subcontractor profiles and 2307 withholding tax vouchers",
    items: [
      {
        key: "contractors.view",
        label: "View Contractor Directory & Payment Logs",
        description: "Access contractor profiles, rate structures, and payment receipts",
      },
      {
        key: "contractors.manage",
        label: "Create Contractors & Issue Payments",
        description: "Add contractor profiles, record disbursements, and generate BIR Form 2307",
      },
    ],
  },
];

export const ALL_PERMISSIONS: string[] = PERMISSION_CATEGORIES.flatMap((c) => c.items.map((i) => i.key));

export const PERMISSION_PRESETS: Record<string, { label: string; permissions: string[] }> = {
  FULL_ADMIN: {
    label: "Full Company Owner / Payroll Admin (All Access)",
    permissions: ALL_PERMISSIONS,
  },
  HR_ADMIN_NO_PAY: {
    label: "HR Admin (201 Info & Documents Only - No Pay Information)",
    permissions: [
      "overview.view",
      "employee.view_info",
      "employee.upload_docs",
      "employee.manage",
      "attendance.view",
      "attendance.manage",
      "leave.view",
      "leave.manage",
    ],
  },
  ATTENDANCE_ONLY: {
    label: "Attendance & Timekeeper Only",
    permissions: ["overview.view", "attendance.view", "attendance.manage", "employee.view_info"],
  },
  PAYROLL_PROCESSOR: {
    label: "Payroll & Tax Processor",
    permissions: [
      "overview.view",
      "employee.view_info",
      "employee.view_compensation",
      "attendance.view",
      "leave.view",
      "loans.view",
      "payroll.compute",
      "payroll.approve",
      "payroll.send_payslips",
      "reports.view",
    ],
  },
};

export function hasPermission(
  grantedPermissions: string[] | null | undefined,
  requiredKey: string,
  platformRole?: string
): boolean {
  if (platformRole === "SUPER_ADMIN") return true;
  if (!grantedPermissions || !Array.isArray(grantedPermissions)) return false;
  return grantedPermissions.includes(requiredKey) || grantedPermissions.includes("*");
}

export function parsePermissions(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return [raw];
    }
  }
  return [];
}
