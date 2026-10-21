import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  StatutoryAgency,
  StatutoryPaymentStatus,
  RemittancePaymentMethod,
} from "@/lib/generated/prisma/enums";

export {
  type ConsolidatedPayableItem,
  type ConsolidatedRemittanceFilters,
  type ConsolidatedSummaryMetrics,
  type ConsolidatedPayablesResult,
  OFFICIAL_STATUTORY_PAYEES,
} from "@/types/remittance";

import {
  type ConsolidatedPayableItem,
  type ConsolidatedRemittanceFilters,
  type ConsolidatedSummaryMetrics,
  type ConsolidatedPayablesResult,
  OFFICIAL_STATUTORY_PAYEES,
} from "@/types/remittance";

/**
 * Fetch and consolidate statutory payables (contributions and loan deductions) across all companies.
 */
export async function getConsolidatedPayables(
  filters: ConsolidatedRemittanceFilters = {}
): Promise<ConsolidatedPayablesResult> {
  const { companyId, agency, itemType = "ALL", status = "ALL", year, month, search } = filters;

  // 1. Fetch companies
  const companies = await prisma.company.findMany({
    where: companyId ? { id: companyId } : undefined,
    select: {
      id: true,
      legalName: true,
      companyCode: true,
      tin: true,
      sssEmployerNumber: true,
      philhealthEmployerNumber: true,
      pagibigEmployerId: true,
      bankAccounts: {
        select: { id: true, bankName: true, accountNumber: true, nickname: true },
        orderBy: { isDefault: "desc" },
      },
    },
    orderBy: { legalName: "asc" },
  });

  const companyMap = new Map(companies.map((c) => [c.id, c]));
  const targetCompanyIds = companies.map((c) => c.id);

  const payableItems: ConsolidatedPayableItem[] = [];

  // ==================== SECTION A: STATUTORY CONTRIBUTIONS ====================
  if (itemType === "ALL" || itemType === "CONTRIBUTION") {
    // Fetch all posted payroll runs for target companies
    const postedRuns = await prisma.payrollRun.findMany({
      where: {
        companyId: { in: targetCompanyIds },
        status: "POSTED",
      },
      include: {
        payrollPeriod: true,
      },
      orderBy: [{ payrollPeriod: { cutoffEnd: "desc" } }, { runNumber: "desc" }],
    });

    // Filter runs by year/month if provided
    const filteredRuns = postedRuns.filter((r) => {
      const end = r.payrollPeriod.cutoffEnd;
      if (year && end.getUTCFullYear() !== year) return false;
      if (month && end.getUTCMonth() + 1 !== month) return false;
      return true;
    });

    const runIds = filteredRuns.map((r) => r.id);

    if (runIds.length > 0) {
      // Fetch line items from payslips
      const payslips = await prisma.payslip.findMany({
        where: {
          payrollRunId: { in: runIds },
        },
        select: {
          payrollRunId: true,
          lineItems: {
            select: {
              category: true,
              amount: true,
            },
          },
        },
      });

      // Group payslip totals by run
      const runTotalsMap = new Map<
        string,
        {
          sssEe: number;
          sssEr: number;
          phicEe: number;
          phicEr: number;
          hdmfEe: number;
          hdmfEr: number;
          birTax: number;
        }
      >();

      for (const p of payslips) {
        let entry = runTotalsMap.get(p.payrollRunId);
        if (!entry) {
          entry = { sssEe: 0, sssEr: 0, phicEe: 0, phicEr: 0, hdmfEe: 0, hdmfEr: 0, birTax: 0 };
          runTotalsMap.set(p.payrollRunId, entry);
        }

        for (const li of p.lineItems) {
          const amt = li.amount.toNumber();
          if (li.category === "SSS_EE") entry.sssEe += amt;
          else if (li.category === "SSS_ER") entry.sssEr += amt;
          else if (li.category === "PHILHEALTH_EE") entry.phicEe += amt;
          else if (li.category === "PHILHEALTH_ER") entry.phicEr += amt;
          else if (li.category === "PAGIBIG_EE") entry.hdmfEe += amt;
          else if (li.category === "PAGIBIG_ER") entry.hdmfEr += amt;
          else if (li.category === "WITHHOLDING_TAX") entry.birTax += amt;
        }
      }

      // Fetch existing StatutoryPaymentRecords for these runs
      const existingRecords = await prisma.statutoryPaymentRecord.findMany({
        where: {
          payrollRunId: { in: runIds },
        },
        include: {
          bankAccount: true,
          checks: {
            where: { status: { not: "VOID" } },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      const recordMap = new Map<string, typeof existingRecords[0]>();
      for (const rec of existingRecords) {
        if (rec.payrollRunId) {
          const key = `${rec.companyId}_${rec.agency}_${rec.payrollRunId}`;
          recordMap.set(key, rec);
        }
      }

      // Build payable contribution items
      for (const run of filteredRuns) {
        const comp = companyMap.get(run.companyId);
        if (!comp) continue;

        const totals = runTotalsMap.get(run.id) || {
          sssEe: 0,
          sssEr: 0,
          phicEe: 0,
          phicEr: 0,
          hdmfEe: 0,
          hdmfEr: 0,
          birTax: 0,
        };

        const cutoffEnd = run.payrollPeriod.cutoffEnd;
        const periodYear = cutoffEnd.getUTCFullYear();
        const periodMonth = cutoffEnd.getUTCMonth() + 1;

        const agencyEntries: Array<{
          agency: StatutoryAgency;
          ee: number;
          er: number;
          total: number;
          agencyNumber?: string | null;
          desc: string;
        }> = [
          {
            agency: StatutoryAgency.SSS,
            ee: totals.sssEe,
            er: totals.sssEr,
            total: totals.sssEe + totals.sssEr,
            agencyNumber: comp.sssEmployerNumber,
            desc: `SSS Premium & MPF/WISP (${periodMonth}/${periodYear})`,
          },
          {
            agency: StatutoryAgency.PHILHEALTH,
            ee: totals.phicEe,
            er: totals.phicEr,
            total: totals.phicEe + totals.phicEr,
            agencyNumber: comp.philhealthEmployerNumber,
            desc: `PhilHealth NHIP Premium (${periodMonth}/${periodYear})`,
          },
          {
            agency: StatutoryAgency.PAGIBIG,
            ee: totals.hdmfEe,
            er: totals.hdmfEr,
            total: totals.hdmfEe + totals.hdmfEr,
            agencyNumber: comp.pagibigEmployerId,
            desc: `Pag-IBIG Regular Mandatory Savings (${periodMonth}/${periodYear})`,
          },
          {
            agency: StatutoryAgency.BIR,
            ee: 0,
            er: 0,
            total: totals.birTax,
            agencyNumber: comp.tin,
            desc: `BIR 1601-C Withholding Tax (${periodMonth}/${periodYear})`,
          },
        ];

        for (const ae of agencyEntries) {
          if (ae.total <= 0) continue; // Skip zero-balance statutory entries

          const key = `${run.companyId}_${ae.agency}_${run.id}`;
          const rec = recordMap.get(key);

          const itemStatus = rec?.status ?? StatutoryPaymentStatus.UNPAID;
          const paidCheck = rec?.checks?.[0];

          payableItems.push({
            id: rec?.id || `contrib_${key}`,
            itemType: "CONTRIBUTION",
            companyId: comp.id,
            companyName: comp.legalName,
            companyCode: comp.companyCode,
            companyTin: comp.tin,
            companyAgencyNumber: ae.agencyNumber,
            agency: ae.agency,
            periodYear,
            periodMonth,
            status: itemStatus,
            totalAmount: Number(ae.total.toFixed(2)),
            description: ae.desc,
            payrollRunId: run.id,
            runNumber: run.runNumber,
            cutoffStart: run.payrollPeriod.cutoffStart.toISOString().slice(0, 10),
            cutoffEnd: run.payrollPeriod.cutoffEnd.toISOString().slice(0, 10),
            eeAmount: Number(ae.ee.toFixed(2)),
            erAmount: Number(ae.er.toFixed(2)),
            paymentRecordId: rec?.id || null,
            checkId: paidCheck?.id || null,
            checkNumber: rec?.checkNumber || paidCheck?.checkNumber || null,
            checkDate: rec?.paymentDate ? rec.paymentDate.toISOString().slice(0, 10) : paidCheck?.checkDate ? paidCheck.checkDate.toISOString().slice(0, 10) : null,
            referenceNumber: rec?.referenceNumber || null,
            bankName: rec?.bankName || rec?.bankAccount?.bankName || paidCheck?.bankName || null,
          });
        }
      }
    }
  }

  // ==================== SECTION B: STATUTORY MEMBER LOANS ====================
  if (itemType === "ALL" || itemType === "LOAN") {
    const loanDeductions = await prisma.loanDeduction.findMany({
      where: {
        loan: {
          companyId: { in: targetCompanyIds },
          category: { in: ["SSS_LOAN", "PAGIBIG_LOAN"] },
        },
      },
      include: {
        loan: {
          include: {
            employee: true,
            company: {
              select: {
                id: true,
                legalName: true,
                companyCode: true,
                tin: true,
                sssEmployerNumber: true,
                pagibigEmployerId: true,
              },
            },
          },
        },
        payrollRun: {
          include: {
            payrollPeriod: true,
          },
        },
        finalPayRun: true,
      },
      orderBy: { cutoffDate: "desc" },
    });

    for (const ld of loanDeductions) {
      const comp = ld.loan.company;
      const cutoffDate = ld.cutoffDate;
      const periodYear = cutoffDate.getUTCFullYear();
      const periodMonth = cutoffDate.getUTCMonth() + 1;

      if (year && periodYear !== year) continue;
      if (month && periodMonth !== month) continue;

      const agencyEnum =
        ld.loan.category === "SSS_LOAN" ? StatutoryAgency.SSS : StatutoryAgency.PAGIBIG;

      const employeeAgencyNum =
        ld.loan.category === "SSS_LOAN" ? ld.loan.employee.sssNumber : ld.loan.employee.pagibigNumber;

      const companyAgencyNum =
        ld.loan.category === "SSS_LOAN" ? comp.sssEmployerNumber : comp.pagibigEmployerId;

      const amount = ld.amountDeducted.toNumber();
      if (amount <= 0) continue;

      payableItems.push({
        id: ld.id,
        itemType: "LOAN",
        companyId: comp.id,
        companyName: comp.legalName,
        companyCode: comp.companyCode,
        companyTin: comp.tin,
        companyAgencyNumber: companyAgencyNum,
        agency: agencyEnum,
        periodYear,
        periodMonth,
        status: ld.remittanceStatus,
        totalAmount: Number(amount.toFixed(2)),
        description: `${ld.loan.name} Deduction — ${ld.loan.employee.lastName}, ${ld.loan.employee.firstName}`,
        loanDeductionId: ld.id,
        employeeId: ld.loan.employeeId,
        employeeName: `${ld.loan.employee.lastName}, ${ld.loan.employee.firstName}`,
        employeeNumber: ld.loan.employee.employeeNumber,
        employeeAgencyNumber: employeeAgencyNum,
        loanName: ld.loan.name,
        loanReference: ld.loan.referenceNumber,
        cutoffDate: cutoffDate.toISOString().slice(0, 10),
        payrollRunId: ld.payrollRunId,
        runNumber: ld.payrollRun?.runNumber || null,
        cutoffStart: ld.payrollRun?.payrollPeriod?.cutoffStart.toISOString().slice(0, 10) || null,
        cutoffEnd: ld.payrollRun?.payrollPeriod?.cutoffEnd.toISOString().slice(0, 10) || null,
        checkNumber: ld.remittanceCheckNumber,
        checkDate: ld.remittanceDate ? ld.remittanceDate.toISOString().slice(0, 10) : null,
        referenceNumber: ld.remittanceReference,
      });
    }
  }

  // ==================== FILTERING & SEARCH ====================
  let filteredItems = payableItems;

  if (agency && agency !== "ALL") {
    filteredItems = filteredItems.filter((i) => i.agency === agency);
  }

  if (status && status !== "ALL") {
    filteredItems = filteredItems.filter((i) => i.status === status);
  }

  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    filteredItems = filteredItems.filter((i) => {
      return (
        i.companyName.toLowerCase().includes(term) ||
        i.companyCode.toLowerCase().includes(term) ||
        i.description.toLowerCase().includes(term) ||
        (i.employeeName && i.employeeName.toLowerCase().includes(term)) ||
        (i.employeeNumber && i.employeeNumber.toLowerCase().includes(term)) ||
        (i.checkNumber && i.checkNumber.toLowerCase().includes(term)) ||
        (i.referenceNumber && i.referenceNumber.toLowerCase().includes(term))
      );
    });
  }

  // ==================== SUMMARY METRICS ====================
  const metrics: ConsolidatedSummaryMetrics = {
    grandTotalDue: 0,
    grandTotalPaid: 0,
    grandTotalPending: 0,
    sssDue: 0,
    sssPaid: 0,
    sssPending: 0,
    philhealthDue: 0,
    philhealthPaid: 0,
    philhealthPending: 0,
    pagibigDue: 0,
    pagibigPaid: 0,
    pagibigPending: 0,
    birDue: 0,
    birPaid: 0,
    birPending: 0,
    totalContributionPending: 0,
    totalLoanPending: 0,
    totalCount: filteredItems.length,
    pendingCount: 0,
    paidCount: 0,
  };

  for (const item of filteredItems) {
    const amt = item.totalAmount;
    const isPaid = item.status === StatutoryPaymentStatus.PAID;

    metrics.grandTotalDue += amt;
    if (isPaid) {
      metrics.grandTotalPaid += amt;
      metrics.paidCount++;
    } else {
      metrics.grandTotalPending += amt;
      metrics.pendingCount++;

      if (item.itemType === "CONTRIBUTION") {
        metrics.totalContributionPending += amt;
      } else {
        metrics.totalLoanPending += amt;
      }
    }

    if (item.agency === StatutoryAgency.SSS) {
      metrics.sssDue += amt;
      if (isPaid) metrics.sssPaid += amt;
      else metrics.sssPending += amt;
    } else if (item.agency === StatutoryAgency.PHILHEALTH) {
      metrics.philhealthDue += amt;
      if (isPaid) metrics.philhealthPaid += amt;
      else metrics.philhealthPending += amt;
    } else if (item.agency === StatutoryAgency.PAGIBIG) {
      metrics.pagibigDue += amt;
      if (isPaid) metrics.pagibigPaid += amt;
      else metrics.pagibigPending += amt;
    } else if (item.agency === StatutoryAgency.BIR) {
      metrics.birDue += amt;
      if (isPaid) metrics.birPaid += amt;
      else metrics.birPending += amt;
    }
  }

  // Round metrics to 2 decimals
  metrics.grandTotalDue = Number(metrics.grandTotalDue.toFixed(2));
  metrics.grandTotalPaid = Number(metrics.grandTotalPaid.toFixed(2));
  metrics.grandTotalPending = Number(metrics.grandTotalPending.toFixed(2));
  metrics.sssDue = Number(metrics.sssDue.toFixed(2));
  metrics.sssPaid = Number(metrics.sssPaid.toFixed(2));
  metrics.sssPending = Number(metrics.sssPending.toFixed(2));
  metrics.philhealthDue = Number(metrics.philhealthDue.toFixed(2));
  metrics.philhealthPaid = Number(metrics.philhealthPaid.toFixed(2));
  metrics.philhealthPending = Number(metrics.philhealthPending.toFixed(2));
  metrics.pagibigDue = Number(metrics.pagibigDue.toFixed(2));
  metrics.pagibigPaid = Number(metrics.pagibigPaid.toFixed(2));
  metrics.pagibigPending = Number(metrics.pagibigPending.toFixed(2));
  metrics.birDue = Number(metrics.birDue.toFixed(2));
  metrics.birPaid = Number(metrics.birPaid.toFixed(2));
  metrics.birPending = Number(metrics.birPending.toFixed(2));
  metrics.totalContributionPending = Number(metrics.totalContributionPending.toFixed(2));
  metrics.totalLoanPending = Number(metrics.totalLoanPending.toFixed(2));

  return {
    items: filteredItems,
    metrics,
    companies,
  };
}

export interface DisburseRemittanceCheckInputItem {
  itemType: "CONTRIBUTION" | "LOAN";
  id: string; // StatutoryPaymentRecord id or deterministic key, or loanDeductionId
  amount: number;
  // Contribution specific
  payrollRunId?: string | null;
  periodYear?: number;
  periodMonth?: number;
  eeAmount?: number;
  erAmount?: number;
  // Loan specific
  loanDeductionId?: string | null;
  description?: string | null;
}

export interface DisburseRemittanceCheckParams {
  companyId: string;
  agency: StatutoryAgency;
  checkNumber: string;
  checkDate: Date | string;
  bankAccountId?: string | null;
  bankName?: string | null;
  payee?: string | null;
  referenceNumber: string; // PRN / SPA / PIS / OR #
  notes?: string | null;
  issuedByUserId?: string | null;
  items: DisburseRemittanceCheckInputItem[];
}

/**
 * Disburse selected statutory items (contributions and/or loans) into a single batch check.
 * Strictly verifies company & agency matching as per Philippine banking and statutory remittance rules.
 */
export async function disburseRemittanceCheck(params: DisburseRemittanceCheckParams) {
  const {
    companyId,
    agency,
    checkNumber,
    checkDate,
    bankAccountId,
    bankName,
    payee,
    referenceNumber,
    notes,
    issuedByUserId,
    items,
  } = params;

  if (!items || items.length === 0) {
    throw new Error("No remittance items selected for disbursement");
  }

  if (!checkNumber || !checkNumber.trim()) {
    throw new Error("Check number is required");
  }

  // Validate company existence
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { id: true, legalName: true, companyCode: true },
  });

  // Determine effective bank name
  let effectiveBankName = bankName;
  if (bankAccountId && !effectiveBankName) {
    const bank = await prisma.companyBankAccount.findUnique({ where: { id: bankAccountId } });
    if (bank) effectiveBankName = bank.bankName;
  }

  const effectivePayee = payee?.trim() || OFFICIAL_STATUTORY_PAYEES[agency];
  const parsedCheckDate = new Date(checkDate);

  // Calculate total check amount
  const totalAmount = items.reduce((sum, item) => sum + Number(item.amount), 0);
  const decimalTotalAmount = new Prisma.Decimal(totalAmount.toFixed(2));

  return prisma.$transaction(async (tx) => {
    // 1. Create the PayrollPaymentCheck
    const check = await tx.payrollPaymentCheck.create({
      data: {
        companyId,
        sourceType: "STATUTORY_REMITTANCE",
        checkNumber: checkNumber.trim(),
        checkDate: parsedCheckDate,
        amount: decimalTotalAmount,
        bankAccountId: bankAccountId || null,
        bankName: effectiveBankName || null,
        payee: effectivePayee,
        notes:
          notes?.trim() ||
          `Statutory Remittance (${agency}) Ref: ${referenceNumber.trim()} — ${items.length} items bundled`,
        status: "ISSUED",
        issuedByUserId: issuedByUserId || null,
      },
    });

    // 2. Process each item in batch
    for (const item of items) {
      if (item.itemType === "CONTRIBUTION") {
        if (!item.periodYear || !item.periodMonth) {
          throw new Error("Contribution items require periodYear and periodMonth");
        }

        const eeDec = new Prisma.Decimal((item.eeAmount ?? 0).toFixed(2));
        const erDec = new Prisma.Decimal((item.erAmount ?? 0).toFixed(2));
        const totalDec = new Prisma.Decimal(Number(item.amount).toFixed(2));

        // Find or create StatutoryPaymentRecord
        const existingRecord = await tx.statutoryPaymentRecord.findFirst({
          where: {
            companyId,
            agency,
            periodYear: item.periodYear,
            periodMonth: item.periodMonth,
            payrollRunId: item.payrollRunId || null,
          },
        });

        const record = existingRecord
          ? await tx.statutoryPaymentRecord.update({
              where: { id: existingRecord.id },
              data: {
                status: StatutoryPaymentStatus.PAID,
                paidAmount: totalDec,
                paymentDate: parsedCheckDate,
                paymentMethod: RemittancePaymentMethod.CHECK,
                checkNumber: checkNumber.trim(),
                referenceNumber: referenceNumber.trim(),
                bankAccountId: bankAccountId || null,
                bankName: effectiveBankName || null,
                notes: notes?.trim() || null,
                taggedByUserId: issuedByUserId || null,
                taggedAt: new Date(),
              },
            })
          : await tx.statutoryPaymentRecord.create({
              data: {
                companyId,
                agency,
                periodYear: item.periodYear,
                periodMonth: item.periodMonth,
                payrollRunId: item.payrollRunId || null,
                computedEeAmount: eeDec,
                computedErAmount: erDec,
                computedTotalAmount: totalDec,
                status: StatutoryPaymentStatus.PAID,
                paidAmount: totalDec,
                paymentDate: parsedCheckDate,
                paymentMethod: RemittancePaymentMethod.CHECK,
                checkNumber: checkNumber.trim(),
                referenceNumber: referenceNumber.trim(),
                bankAccountId: bankAccountId || null,
                bankName: effectiveBankName || null,
                notes: notes?.trim() || null,
                taggedByUserId: issuedByUserId || null,
                taggedAt: new Date(),
              },
            });

        // Link to check batch
        await tx.remittanceCheckBatchItem.create({
          data: {
            checkId: check.id,
            companyId,
            agency,
            itemType: "CONTRIBUTION",
            statutoryPaymentRecordId: record.id,
            amount: totalDec,
            description: `${agency} Contribution (${item.periodMonth}/${item.periodYear})`,
          },
        });
      } else if (item.itemType === "LOAN") {
        const loanDeductionId = item.loanDeductionId || item.id;
        const totalDec = new Prisma.Decimal(Number(item.amount).toFixed(2));

        // Update LoanDeduction status
        await tx.loanDeduction.update({
          where: { id: loanDeductionId },
          data: {
            remittanceStatus: StatutoryPaymentStatus.PAID,
            remittanceDate: parsedCheckDate,
            remittanceCheckNumber: checkNumber.trim(),
            remittanceReference: referenceNumber.trim(),
          },
        });

        // Link to check batch
        await tx.remittanceCheckBatchItem.create({
          data: {
            checkId: check.id,
            companyId,
            agency,
            itemType: "LOAN",
            loanDeductionId,
            amount: totalDec,
            description: item.description || `${agency} Member Loan Remittance`,
          },
        });
      }
    }

    return check;
  });
}

/**
 * Fetch all statutory remittance checks issued with their detailed batch items.
 */
export async function getRemittanceChecks(options: { companyId?: string; agency?: StatutoryAgency } = {}) {
  const { companyId, agency } = options;

  return prisma.payrollPaymentCheck.findMany({
    where: {
      sourceType: "STATUTORY_REMITTANCE",
      ...(companyId ? { companyId } : {}),
      ...(agency
        ? {
            remittanceBatchItems: {
              some: { agency },
            },
          }
        : {}),
    },
    include: {
      company: {
        select: {
          id: true,
          legalName: true,
          companyCode: true,
          tin: true,
          sssEmployerNumber: true,
          philhealthEmployerNumber: true,
          pagibigEmployerId: true,
        },
      },
      bankAccount: true,
      remittanceBatchItems: {
        include: {
          statutoryPaymentRecord: true,
          loanDeduction: {
            include: {
              loan: {
                include: {
                  employee: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ checkDate: "desc" }, { createdAt: "desc" }],
  });
}

/**
 * Void a statutory remittance check and revert its linked items to UNPAID.
 */
export async function voidRemittanceCheck(checkId: string) {
  return prisma.$transaction(async (tx) => {
    const check = await tx.payrollPaymentCheck.findUniqueOrThrow({
      where: { id: checkId },
      include: { remittanceBatchItems: true },
    });

    if (check.status === "VOID") {
      return check;
    }

    // Revert all contribution and loan items
    for (const batchItem of check.remittanceBatchItems) {
      if (batchItem.statutoryPaymentRecordId) {
        await tx.statutoryPaymentRecord.update({
          where: { id: batchItem.statutoryPaymentRecordId },
          data: {
            status: StatutoryPaymentStatus.UNPAID,
            paidAmount: null,
            paymentDate: null,
            checkNumber: null,
          },
        });
      }

      if (batchItem.loanDeductionId) {
        await tx.loanDeduction.update({
          where: { id: batchItem.loanDeductionId },
          data: {
            remittanceStatus: StatutoryPaymentStatus.UNPAID,
            remittanceDate: null,
            remittanceCheckNumber: null,
            remittanceReference: null,
          },
        });
      }
    }

    // Mark check VOID
    return tx.payrollPaymentCheck.update({
      where: { id: checkId },
      data: { status: "VOID" },
    });
  });
}
