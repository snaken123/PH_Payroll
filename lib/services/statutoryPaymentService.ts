import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  StatutoryAgency,
  StatutoryPaymentStatus,
  RemittancePaymentMethod,
} from "@/lib/generated/prisma/enums";

export interface StatutoryAgencyItem {
  agency: StatutoryAgency;
  label: string;
  eeAmount: number;
  erAmount: number;
  totalAmount: number;
  status: StatutoryPaymentStatus;
  paymentRecordId?: string | null;
  paidAmount?: number | null;
  paymentDate?: string | null;
  paymentMethod?: RemittancePaymentMethod | null;
  checkNumber?: string | null;
  referenceNumber?: string | null;
  bankAccountId?: string | null;
  bankName?: string | null;
  notes?: string | null;
  taggedByUserId?: string | null;
  taggedAt?: string | null;
}

export interface ContributionRunGroup {
  payrollRunId: string;
  runNumber: number;
  cutoffStart: string;
  cutoffEnd: string;
  payDate: string;
  agencies: StatutoryAgencyItem[];
  totalDue: number;
  totalPaid: number;
  totalPending: number;
}

export interface ContributionsSummaryResult {
  company: {
    id: string;
    legalName: string;
    companyCode: string;
    tin: string;
  };
  filter: {
    payrollRunId?: string;
    year?: number;
    month?: number;
  };
  groups: ContributionRunGroup[];
  grandTotalDue: number;
  grandTotalPaid: number;
  grandTotalPending: number;
  availableRuns: {
    id: string;
    runNumber: number;
    cutoffStart: string;
    cutoffEnd: string;
  }[];
}

export interface TagStatutoryPaymentParams {
  companyId: string;
  agency: StatutoryAgency;
  payrollRunId?: string | null;
  periodMonth: number;
  periodYear: number;
  computedEeAmount: number | string | Prisma.Decimal;
  computedErAmount: number | string | Prisma.Decimal;
  computedTotalAmount: number | string | Prisma.Decimal;
  status: StatutoryPaymentStatus;
  paidAmount?: number | string | Prisma.Decimal | null;
  paymentDate?: Date | string | null;
  paymentMethod?: RemittancePaymentMethod | null;
  checkNumber?: string | null;
  referenceNumber?: string | null;
  bankAccountId?: string | null;
  bankName?: string | null;
  notes?: string | null;
  taggedByUserId?: string | null;
}

export async function getCompanyContributionsSummary(
  companyId: string,
  options: { payrollRunId?: string; year?: number; month?: number } = {}
): Promise<ContributionsSummaryResult> {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { id: true, legalName: true, companyCode: true, tin: true },
  });

  // Fetch all posted runs for company to list in selector
  const allPostedRuns = await prisma.payrollRun.findMany({
    where: { companyId, status: "POSTED" },
    include: { payrollPeriod: true },
    orderBy: { runNumber: "desc" },
  });

  // Filter which runs to include in this report
  let targetRuns = allPostedRuns;
  if (options.payrollRunId) {
    targetRuns = allPostedRuns.filter((r) => r.id === options.payrollRunId);
  } else if (options.year && options.month) {
    const startOfMonth = new Date(Date.UTC(options.year, options.month - 1, 1));
    const endOfMonth = new Date(Date.UTC(options.year, options.month, 0, 23, 59, 59, 999));
    targetRuns = allPostedRuns.filter((r) => {
      const d = r.payrollPeriod.cutoffEnd;
      return d >= startOfMonth && d <= endOfMonth;
    });
  }

  // Fetch payslips with line items for all target runs
  const runIds = targetRuns.map((r) => r.id);
  const payslips = await prisma.payslip.findMany({
    where: {
      payrollRunId: { in: runIds },
    },
    include: {
      lineItems: true,
    },
  });

  // Group payslips by run
  const payslipsByRun = new Map<string, typeof payslips>();
  for (const p of payslips) {
    const list = payslipsByRun.get(p.payrollRunId) || [];
    list.push(p);
    payslipsByRun.set(p.payrollRunId, list);
  }

  // Fetch existing StatutoryPaymentRecords for these runs / company
  const existingRecords = await prisma.statutoryPaymentRecord.findMany({
    where: {
      companyId,
      OR: [
        { payrollRunId: { in: runIds } },
        ...(options.year && options.month
          ? [{ periodYear: options.year, periodMonth: options.month }]
          : []),
      ],
    },
    include: {
      bankAccount: true,
    },
  });

  const recordMap = new Map<string, typeof existingRecords[0]>();
  for (const rec of existingRecords) {
    const key = `${rec.agency}_${rec.payrollRunId ?? ""}_${rec.periodYear}_${rec.periodMonth}`;
    recordMap.set(key, rec);
  }

  const groups: ContributionRunGroup[] = [];
  let grandTotalDue = 0;
  let grandTotalPaid = 0;
  let grandTotalPending = 0;

  for (const run of targetRuns) {
    const runPayslips = payslipsByRun.get(run.id) || [];
    const cutoffEndDate = run.payrollPeriod.cutoffEnd;
    const periodYear = cutoffEndDate.getUTCFullYear();
    const periodMonth = cutoffEndDate.getUTCMonth() + 1;

    // 1. SSS
    let sssEe = 0;
    let sssEr = 0;
    // 2. PhilHealth
    let phicEe = 0;
    let phicEr = 0;
    // 3. Pag-IBIG
    let hdmfEe = 0;
    let hdmfEr = 0;
    // 4. BIR Withholding Tax
    let birTax = 0;

    for (const p of runPayslips) {
      for (const li of p.lineItems) {
        const amt = li.amount.toNumber();
        if (li.category === "SSS_EE") sssEe += amt;
        else if (li.category === "SSS_ER") sssEr += amt;
        else if (li.category === "PHILHEALTH_EE") phicEe += amt;
        else if (li.category === "PHILHEALTH_ER") phicEr += amt;
        else if (li.category === "PAGIBIG_EE") hdmfEe += amt;
        else if (li.category === "PAGIBIG_ER") hdmfEr += amt;
        else if (li.category === "WITHHOLDING_TAX") birTax += amt;
      }
    }

    const agencyConfigs = [
      { agency: StatutoryAgency.SSS, label: "Social Security System (SSS R-3)", ee: sssEe, er: sssEr, total: sssEe + sssEr },
      { agency: StatutoryAgency.PHILHEALTH, label: "PhilHealth (PhilHealth RF-1)", ee: phicEe, er: phicEr, total: phicEe + phicEr },
      { agency: StatutoryAgency.PAGIBIG, label: "Pag-IBIG Fund (Pag-IBIG MCRF)", ee: hdmfEe, er: hdmfEr, total: hdmfEe + hdmfEr },
      { agency: StatutoryAgency.BIR, label: "BIR Withholding Tax (Form 1601-C)", ee: 0, er: 0, total: birTax },
    ];

    const agencies: StatutoryAgencyItem[] = [];
    let runTotalDue = 0;
    let runTotalPaid = 0;
    let runTotalPending = 0;

    for (const cfg of agencyConfigs) {
      const key = `${cfg.agency}_${run.id}_${periodYear}_${periodMonth}`;
      const rec = recordMap.get(key);

      const status = rec?.status ?? StatutoryPaymentStatus.UNPAID;
      const isPaid = status === StatutoryPaymentStatus.PAID;
      const totalAmount = Number(cfg.total.toFixed(2));

      runTotalDue += totalAmount;
      if (isPaid) {
        runTotalPaid += rec?.paidAmount ? Number(rec.paidAmount) : totalAmount;
      } else {
        runTotalPending += totalAmount;
      }

      agencies.push({
        agency: cfg.agency,
        label: cfg.label,
        eeAmount: Number(cfg.ee.toFixed(2)),
        erAmount: Number(cfg.er.toFixed(2)),
        totalAmount,
        status,
        paymentRecordId: rec?.id || null,
        paidAmount: rec?.paidAmount ? Number(rec.paidAmount) : null,
        paymentDate: rec?.paymentDate ? rec.paymentDate.toISOString().slice(0, 10) : null,
        paymentMethod: rec?.paymentMethod || null,
        checkNumber: rec?.checkNumber || null,
        referenceNumber: rec?.referenceNumber || null,
        bankAccountId: rec?.bankAccountId || null,
        bankName: rec?.bankName || rec?.bankAccount?.bankName || null,
        notes: rec?.notes || null,
        taggedByUserId: rec?.taggedByUserId || null,
        taggedAt: rec?.taggedAt ? rec.taggedAt.toISOString() : null,
      });
    }

    groups.push({
      payrollRunId: run.id,
      runNumber: run.runNumber,
      cutoffStart: run.payrollPeriod.cutoffStart.toISOString().slice(0, 10),
      cutoffEnd: run.payrollPeriod.cutoffEnd.toISOString().slice(0, 10),
      payDate: run.payrollPeriod.payDate.toISOString().slice(0, 10),
      agencies,
      totalDue: runTotalDue,
      totalPaid: runTotalPaid,
      totalPending: runTotalPending,
    });

    grandTotalDue += runTotalDue;
    grandTotalPaid += runTotalPaid;
    grandTotalPending += runTotalPending;
  }

  return {
    company,
    filter: options,
    groups,
    grandTotalDue,
    grandTotalPaid,
    grandTotalPending,
    availableRuns: allPostedRuns.map((r) => ({
      id: r.id,
      runNumber: r.runNumber,
      cutoffStart: r.payrollPeriod.cutoffStart.toISOString().slice(0, 10),
      cutoffEnd: r.payrollPeriod.cutoffEnd.toISOString().slice(0, 10),
    })),
  };
}

export async function tagStatutoryPayment(params: TagStatutoryPaymentParams) {
  const {
    companyId,
    agency,
    payrollRunId,
    periodMonth,
    periodYear,
    computedEeAmount,
    computedErAmount,
    computedTotalAmount,
    status,
    paidAmount,
    paymentDate,
    paymentMethod,
    checkNumber,
    referenceNumber,
    bankAccountId,
    bankName,
    notes,
    taggedByUserId,
  } = params;

  // Resolve bank name if bankAccountId provided
  let effectiveBankName = bankName;
  if (bankAccountId && !effectiveBankName) {
    const bank = await prisma.companyBankAccount.findUnique({ where: { id: bankAccountId } });
    if (bank) effectiveBankName = bank.bankName;
  }

  const effectivePaidAmount =
    paidAmount !== undefined && paidAmount !== null
      ? new Prisma.Decimal(paidAmount)
      : status === StatutoryPaymentStatus.PAID
        ? new Prisma.Decimal(computedTotalAmount)
        : null;

  const existing = await prisma.statutoryPaymentRecord.findFirst({
    where: {
      companyId,
      agency,
      periodYear,
      periodMonth,
      payrollRunId: payrollRunId || null,
    },
  });

  const record = existing
    ? await prisma.statutoryPaymentRecord.update({
        where: { id: existing.id },
        data: {
          computedEeAmount: new Prisma.Decimal(computedEeAmount),
          computedErAmount: new Prisma.Decimal(computedErAmount),
          computedTotalAmount: new Prisma.Decimal(computedTotalAmount),
          status,
          paidAmount: effectivePaidAmount,
          paymentDate: paymentDate ? new Date(paymentDate) : null,
          paymentMethod: paymentMethod || null,
          checkNumber: checkNumber ? checkNumber.trim() : null,
          referenceNumber: referenceNumber ? referenceNumber.trim() : null,
          bankAccountId: bankAccountId || null,
          bankName: effectiveBankName || null,
          notes: notes ? notes.trim() : null,
          taggedByUserId: taggedByUserId || null,
          taggedAt: new Date(),
        },
        include: {
          bankAccount: true,
          payrollRun: {
            include: {
              payrollPeriod: true,
            },
          },
        },
      })
    : await prisma.statutoryPaymentRecord.create({
        data: {
          companyId,
          agency,
          payrollRunId: payrollRunId || null,
          periodMonth,
          periodYear,
          computedEeAmount: new Prisma.Decimal(computedEeAmount),
          computedErAmount: new Prisma.Decimal(computedErAmount),
          computedTotalAmount: new Prisma.Decimal(computedTotalAmount),
          status,
          paidAmount: effectivePaidAmount,
          paymentDate: paymentDate ? new Date(paymentDate) : null,
          paymentMethod: paymentMethod || null,
          checkNumber: checkNumber ? checkNumber.trim() : null,
          referenceNumber: referenceNumber ? referenceNumber.trim() : null,
          bankAccountId: bankAccountId || null,
          bankName: effectiveBankName || null,
          notes: notes ? notes.trim() : null,
          taggedByUserId: taggedByUserId || null,
          taggedAt: new Date(),
        },
        include: {
          bankAccount: true,
          payrollRun: {
            include: {
              payrollPeriod: true,
            },
          },
        },
      });

  // Automatically sync with PayrollPaymentCheck for the Check Register
  if (status === StatutoryPaymentStatus.PAID && paymentMethod === RemittancePaymentMethod.CHECK && checkNumber?.trim()) {
    const existingCheck = await prisma.payrollPaymentCheck.findFirst({
      where: { statutoryPaymentRecordId: record.id },
    });
    if (existingCheck) {
      await prisma.payrollPaymentCheck.update({
        where: { id: existingCheck.id },
        data: {
          checkNumber: checkNumber.trim(),
          checkDate: paymentDate ? new Date(paymentDate) : new Date(),
          amount: effectivePaidAmount || new Prisma.Decimal(computedTotalAmount),
          bankAccountId: bankAccountId || null,
          bankName: effectiveBankName || null,
          payee: agency,
          notes: notes ? notes.trim() : null,
          status: "ISSUED",
        },
      });
    } else {
      await prisma.payrollPaymentCheck.create({
        data: {
          companyId,
          statutoryPaymentRecordId: record.id,
          sourceType: "STATUTORY_REMITTANCE",
          checkNumber: checkNumber.trim(),
          checkDate: paymentDate ? new Date(paymentDate) : new Date(),
          amount: effectivePaidAmount || new Prisma.Decimal(computedTotalAmount),
          bankAccountId: bankAccountId || null,
          bankName: effectiveBankName || null,
          payee: agency,
          notes: notes ? notes.trim() : `Statutory Payment Remittance (${agency} ${periodMonth}/${periodYear})`,
          status: "ISSUED",
          issuedByUserId: taggedByUserId || null,
        },
      });
    }
  } else if (existing) {
    const existingCheck = await prisma.payrollPaymentCheck.findFirst({
      where: { statutoryPaymentRecordId: record.id, status: { not: "VOID" } },
    });
    if (existingCheck && (status !== StatutoryPaymentStatus.PAID || paymentMethod !== RemittancePaymentMethod.CHECK)) {
      await prisma.payrollPaymentCheck.update({
        where: { id: existingCheck.id },
        data: { status: "VOID" },
      });
    }
  }

  return record;
}
