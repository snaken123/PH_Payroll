import { prisma } from "@/lib/db";
import { LoanCategory, LoanStatus, LeaveRequestStatus, PayrollRunStatus, FinalPayRunStatus, ContractorPaymentStatus } from "@/lib/generated/prisma/enums";

export type TodoCategory = "PAYROLL" | "LOAN" | "LEAVE" | "FINAL_PAY" | "CONTRACTOR_PAYMENT";

export interface TodoItem {
  id: string;
  category: TodoCategory;
  title: string;
  subtitle: string;
  date: string;
  amount?: number;
  status: string;
  badgeLabel: string;
  badgeVariant: "amber" | "blue" | "emerald" | "purple" | "indigo";
  actionUrl: string;
  actionLabel: string;
  createdAt: Date;
}

export interface TodoSummary {
  items: TodoItem[];
  counts: {
    total: number;
    payroll: number;
    loans: number;
    leave: number;
    finalPay: number;
    contractors: number;
  };
}

export async function getSuperUserTodoList(companyId: string): Promise<TodoSummary> {
  const [payrollRuns, loans, leaveRequests, finalPayRuns, contractorPayments] = await Promise.all([
    // 1. Payroll Runs (Draft/Pending Approval needing approval, Approved needing posting)
    prisma.payrollRun.findMany({
      where: {
        companyId,
        status: { in: [PayrollRunStatus.DRAFT, PayrollRunStatus.PENDING_APPROVAL, PayrollRunStatus.APPROVED] },
      },
      include: {
        payrollPeriod: true,
        _count: { select: { payslips: true } },
      },
      orderBy: { createdAt: "desc" },
    }),

    // 2. Loans / Cash Advances (Pending Approval)
    prisma.loan.findMany({
      where: {
        companyId,
        status: LoanStatus.PENDING_APPROVAL,
      },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeNumber: true, positionTitle: true } },
      },
      orderBy: { createdAt: "desc" },
    }),

    // 3. Leave Requests (Pending Approval)
    prisma.leaveRequest.findMany({
      where: {
        employee: { companyId, isDeleted: false },
        status: LeaveRequestStatus.PENDING,
      },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeNumber: true, positionTitle: true } },
        leaveType: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    }),

    // 4. Final Pay Runs (Draft or Approved)
    prisma.finalPayRun.findMany({
      where: {
        companyId,
        status: { in: [FinalPayRunStatus.DRAFT, FinalPayRunStatus.APPROVED] },
      },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeNumber: true, positionTitle: true } },
      },
      orderBy: { createdAt: "desc" },
    }),

    // 5. Contractor Payments (Draft)
    prisma.contractorPayment.findMany({
      where: {
        companyId,
        status: ContractorPaymentStatus.DRAFT,
      },
      include: {
        contractor: { select: { name: true, tin: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const items: TodoItem[] = [];

  // Map Payroll Runs
  for (const run of payrollRuns) {
    const isApprovalNeeded = run.status === PayrollRunStatus.DRAFT || run.status === PayrollRunStatus.PENDING_APPROVAL;
    const periodStr = `${run.payrollPeriod.cutoffStart.toISOString().slice(0, 10)} to ${run.payrollPeriod.cutoffEnd.toISOString().slice(0, 10)}`;
    items.push({
      id: `run-${run.id}`,
      category: "PAYROLL",
      title: `Payroll Run #${run.runNumber} (${isApprovalNeeded ? "Review & Approve" : "Ready to Post"})`,
      subtitle: `Cutoff: ${periodStr} · ${run._count.payslips} employees`,
      date: new Date(run.payrollPeriod.payDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      status: run.status,
      badgeLabel: isApprovalNeeded ? "Pending Approval" : "Approved · Needs Posting",
      badgeVariant: isApprovalNeeded ? "amber" : "blue",
      actionUrl: `/dashboard/payroll/${run.id}`,
      actionLabel: isApprovalNeeded ? "Review & Approve Run" : "Post Payroll Run",
      createdAt: run.createdAt,
    });
  }

  // Map Loans & Cash Advances
  for (const loan of loans) {
    const isCashAdvance = loan.category === LoanCategory.CASH_ADVANCE;
    const empName = `${loan.employee.lastName}, ${loan.employee.firstName}`;
    items.push({
      id: `loan-${loan.id}`,
      category: "LOAN",
      title: `${isCashAdvance ? "Cash Advance Application" : `${loan.name} Application`} — ${empName}`,
      subtitle: `#${loan.employee.employeeNumber} ${loan.employee.positionTitle ? `• ${loan.employee.positionTitle}` : ""} · Term: ${loan.termMonths ?? 1} mo(s)`,
      date: new Date(loan.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      amount: Number(loan.principal),
      status: loan.status,
      badgeLabel: isCashAdvance ? "Cash Advance Pending" : "Loan Pending",
      badgeVariant: "indigo",
      actionUrl: "/dashboard/loans",
      actionLabel: "Review Application",
      createdAt: loan.createdAt,
    });
  }

  // Map Leave Requests
  for (const leave of leaveRequests) {
    const empName = `${leave.employee.lastName}, ${leave.employee.firstName}`;
    const startStr = leave.startDate.toISOString().slice(0, 10);
    const endStr = leave.endDate.toISOString().slice(0, 10);
    items.push({
      id: `leave-${leave.id}`,
      category: "LEAVE",
      title: `${leave.leaveType.name} Request — ${empName}`,
      subtitle: `#${leave.employee.employeeNumber} · ${startStr} to ${endStr} (${leave.daysCount} day(s))`,
      date: `${startStr} to ${endStr}`,
      status: leave.status,
      badgeLabel: "Leave Pending",
      badgeVariant: "emerald",
      actionUrl: "/dashboard/leave",
      actionLabel: "Approve / Reject Leave",
      createdAt: leave.createdAt,
    });
  }

  // Map Final Pay Runs
  for (const fp of finalPayRuns) {
    const empName = `${fp.employee.lastName}, ${fp.employee.firstName}`;
    const isApprovalNeeded = fp.status === FinalPayRunStatus.DRAFT;
    items.push({
      id: `finalpay-${fp.id}`,
      category: "FINAL_PAY",
      title: `Final Pay #${fp.finalPayNumber} (${empName})`,
      subtitle: `#${fp.employee.employeeNumber} · Separation Date: ${fp.separationDate.toISOString().slice(0, 10)}`,
      date: fp.separationDate.toISOString().slice(0, 10),
      amount: Number(fp.netFinalPay),
      status: fp.status,
      badgeLabel: isApprovalNeeded ? "Final Pay Draft" : "Final Pay Approved",
      badgeVariant: "purple",
      actionUrl: `/dashboard/employees/${fp.employeeId}/final-pay/${fp.id}`,
      actionLabel: isApprovalNeeded ? "Review Final Pay" : "Post Final Pay",
      createdAt: fp.createdAt,
    });
  }

  // Map Contractor Payments
  for (const cp of contractorPayments) {
    items.push({
      id: `contractor-${cp.id}`,
      category: "CONTRACTOR_PAYMENT",
      title: `Contractor Voucher #${cp.paymentNumber} (${cp.contractor.name})`,
      subtitle: `Invoice Ref: ${cp.invoiceReference || "N/A"} · EWT Net: PHP ${Number(cp.netAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      date: new Date(cp.paymentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      amount: Number(cp.netAmount),
      status: cp.status,
      badgeLabel: "Contractor Draft",
      badgeVariant: "blue",
      actionUrl: `/dashboard/contractors/${cp.contractorId}`,
      actionLabel: "Review Voucher",
      createdAt: cp.createdAt,
    });
  }

  // Sort items by createdAt descending
  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return {
    items,
    counts: {
      total: items.length,
      payroll: payrollRuns.length,
      loans: loans.length,
      leave: leaveRequests.length,
      finalPay: finalPayRuns.length,
      contractors: contractorPayments.length,
    },
  };
}
