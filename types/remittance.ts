import {
  StatutoryAgency,
  StatutoryPaymentStatus,
} from "@/lib/generated/prisma/enums";

export interface ConsolidatedPayableItem {
  id: string; // Unique key or ID
  itemType: "CONTRIBUTION" | "LOAN";
  companyId: string;
  companyName: string;
  companyCode: string;
  companyTin: string;
  companyAgencyNumber?: string | null;
  agency: StatutoryAgency;
  periodYear: number;
  periodMonth: number;
  status: StatutoryPaymentStatus;
  totalAmount: number;
  description: string;

  // Specific to Contributions
  payrollRunId?: string | null;
  runNumber?: number | null;
  cutoffStart?: string | null;
  cutoffEnd?: string | null;
  eeAmount?: number;
  erAmount?: number;
  paymentRecordId?: string | null;

  // Specific to Loans
  loanDeductionId?: string | null;
  employeeId?: string | null;
  employeeName?: string | null;
  employeeNumber?: string | null;
  employeeAgencyNumber?: string | null;
  loanName?: string | null;
  loanReference?: string | null;
  cutoffDate?: string | null;

  // Remittance payment info (if paid)
  checkId?: string | null;
  checkNumber?: string | null;
  checkDate?: string | null;
  referenceNumber?: string | null;
  bankName?: string | null;
}

export interface ConsolidatedRemittanceFilters {
  companyId?: string;
  agency?: StatutoryAgency | "ALL";
  itemType?: "ALL" | "CONTRIBUTION" | "LOAN";
  status?: StatutoryPaymentStatus | "ALL";
  year?: number;
  month?: number;
  search?: string;
}

export interface ConsolidatedSummaryMetrics {
  grandTotalDue: number;
  grandTotalPaid: number;
  grandTotalPending: number;
  sssDue: number;
  sssPaid: number;
  sssPending: number;
  philhealthDue: number;
  philhealthPaid: number;
  philhealthPending: number;
  pagibigDue: number;
  pagibigPaid: number;
  pagibigPending: number;
  birDue: number;
  birPaid: number;
  birPending: number;
  totalContributionPending: number;
  totalLoanPending: number;
  totalCount: number;
  pendingCount: number;
  paidCount: number;
}

export interface ConsolidatedPayablesResult {
  items: ConsolidatedPayableItem[];
  metrics: ConsolidatedSummaryMetrics;
  companies: Array<{
    id: string;
    legalName: string;
    companyCode: string;
    tin: string;
    sssEmployerNumber?: string | null;
    philhealthEmployerNumber?: string | null;
    pagibigEmployerId?: string | null;
    bankAccounts: Array<{ id: string; bankName: string; accountNumber: string; nickname?: string | null }>;
  }>;
}

/**
 * Official government agency full legal names for Philippine check payees
 */
export const OFFICIAL_STATUTORY_PAYEES: Record<StatutoryAgency, string> = {
  [StatutoryAgency.SSS]: "Social Security System",
  [StatutoryAgency.PHILHEALTH]: "Philippine Health Insurance Corporation",
  [StatutoryAgency.PAGIBIG]: "Home Development Mutual Fund",
  [StatutoryAgency.BIR]: "Bureau of Internal Revenue",
};
