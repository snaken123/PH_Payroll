import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";

export interface CreateCheckParams {
  companyId: string;
  payrollRunId?: string | null;
  finalPayRunId?: string | null;
  statutoryPaymentRecordId?: string | null;
  sourceType?: string;
  checkNumber: string;
  checkDate: Date | string;
  amount: number | string | Prisma.Decimal;
  bankAccountId?: string | null;
  bankName?: string | null;
  payee?: string | null;
  notes?: string | null;
  status?: string;
  issuedByUserId?: string | null;
}

export interface UpdateCheckParams {
  companyId: string;
  checkId: string;
  checkNumber?: string;
  checkDate?: Date | string;
  amount?: number | string | Prisma.Decimal;
  bankAccountId?: string | null;
  bankName?: string | null;
  payee?: string | null;
  notes?: string | null;
  status?: string;
}

export interface ListCompanyChecksOptions {
  search?: string;
  status?: string;
  sourceType?: string;
  startDate?: Date;
  endDate?: Date;
  payrollRunId?: string;
  take?: number;
  skip?: number;
}

export async function getPayrollRunChecks(companyId: string, payrollRunId: string) {
  return prisma.payrollPaymentCheck.findMany({
    where: {
      companyId,
      payrollRunId,
    },
    include: {
      bankAccount: true,
      payrollRun: {
        include: {
          payrollPeriod: true,
        },
      },
      finalPayRun: {
        include: {
          employee: true,
        },
      },
      statutoryPaymentRecord: true,
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
    orderBy: { createdAt: "desc" },
  });
}

export async function createPayrollCheck(params: CreateCheckParams) {
  const {
    companyId,
    payrollRunId,
    finalPayRunId,
    statutoryPaymentRecordId,
    sourceType: inputSourceType,
    checkNumber,
    checkDate,
    amount,
    bankAccountId,
    bankName,
    payee,
    notes,
    status = "ISSUED",
    issuedByUserId,
  } = params;

  // Validate run exists if provided
  if (payrollRunId) {
    const run = await prisma.payrollRun.findUnique({
      where: { id: payrollRunId },
      include: { payrollPeriod: true },
    });
    if (!run || run.companyId !== companyId) {
      throw new Error("Payroll run not found for this company");
    }
  }

  if (finalPayRunId) {
    const finalRun = await prisma.finalPayRun.findUnique({
      where: { id: finalPayRunId },
    });
    if (!finalRun || finalRun.companyId !== companyId) {
      throw new Error("Final pay run not found for this company");
    }
  }

  // If bankAccountId is provided, populate bankName if not given
  let effectiveBankName = bankName;
  if (bankAccountId && !effectiveBankName) {
    const bank = await prisma.companyBankAccount.findUnique({ where: { id: bankAccountId } });
    if (bank) {
      effectiveBankName = bank.bankName;
    }
  }

  const sourceType =
    inputSourceType ||
    (finalPayRunId ? "SEPARATION_PAY" : statutoryPaymentRecordId ? "STATUTORY_REMITTANCE" : "PAYROLL_RUN");

  return prisma.payrollPaymentCheck.create({
    data: {
      companyId,
      payrollRunId: payrollRunId || null,
      finalPayRunId: finalPayRunId || null,
      statutoryPaymentRecordId: statutoryPaymentRecordId || null,
      sourceType,
      checkNumber: checkNumber.trim(),
      checkDate: new Date(checkDate),
      amount: new Prisma.Decimal(amount),
      bankAccountId: bankAccountId || null,
      bankName: effectiveBankName || null,
      payee: payee ? payee.trim() : null,
      notes: notes ? notes.trim() : null,
      status,
      issuedByUserId: issuedByUserId || null,
    },
    include: {
      bankAccount: true,
      payrollRun: {
        include: {
          payrollPeriod: true,
        },
      },
      finalPayRun: {
        include: {
          employee: true,
        },
      },
      statutoryPaymentRecord: true,
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
  });
}

export async function updatePayrollCheck(params: UpdateCheckParams) {
  const { companyId, checkId, ...updates } = params;

  const existing = await prisma.payrollPaymentCheck.findUnique({
    where: { id: checkId },
  });

  if (!existing || existing.companyId !== companyId) {
    throw new Error("Check not found");
  }

  let effectiveBankName = updates.bankName !== undefined ? updates.bankName : existing.bankName;
  if (updates.bankAccountId && updates.bankAccountId !== existing.bankAccountId && !updates.bankName) {
    const bank = await prisma.companyBankAccount.findUnique({ where: { id: updates.bankAccountId } });
    if (bank) {
      effectiveBankName = bank.bankName;
    }
  }

  return prisma.payrollPaymentCheck.update({
    where: { id: checkId },
    data: {
      ...(updates.checkNumber !== undefined && { checkNumber: updates.checkNumber.trim() }),
      ...(updates.checkDate !== undefined && { checkDate: new Date(updates.checkDate) }),
      ...(updates.amount !== undefined && { amount: new Prisma.Decimal(updates.amount) }),
      ...(updates.bankAccountId !== undefined && { bankAccountId: updates.bankAccountId || null }),
      ...(effectiveBankName !== undefined && { bankName: effectiveBankName || null }),
      ...(updates.payee !== undefined && { payee: updates.payee ? updates.payee.trim() : null }),
      ...(updates.notes !== undefined && { notes: updates.notes ? updates.notes.trim() : null }),
      ...(updates.status !== undefined && { status: updates.status }),
    },
    include: {
      bankAccount: true,
      payrollRun: {
        include: {
          payrollPeriod: true,
        },
      },
      finalPayRun: {
        include: {
          employee: true,
        },
      },
      statutoryPaymentRecord: true,
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
  });
}

export async function deleteOrVoidPayrollCheck(companyId: string, checkId: string, action: "VOID" | "DELETE" = "VOID") {
  const existing = await prisma.payrollPaymentCheck.findUnique({
    where: { id: checkId },
  });

  if (!existing || existing.companyId !== companyId) {
    throw new Error("Check not found");
  }

  if (action === "DELETE") {
    return prisma.payrollPaymentCheck.delete({
      where: { id: checkId },
    });
  }

  return prisma.payrollPaymentCheck.update({
    where: { id: checkId },
    data: { status: "VOID" },
  });
}

export async function listCompanyChecks(companyId: string, options: ListCompanyChecksOptions = {}) {
  const { search, status, sourceType, startDate, endDate, payrollRunId, take = 50, skip = 0 } = options;

  const where: Prisma.PayrollPaymentCheckWhereInput = {
    companyId,
    ...(status && status !== "ALL" ? { status } : {}),
    ...(sourceType && sourceType !== "ALL" ? { sourceType } : {}),
    ...(payrollRunId ? { payrollRunId } : {}),
    ...(startDate || endDate
      ? {
          checkDate: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { checkNumber: { contains: search, mode: "insensitive" } },
            { payee: { contains: search, mode: "insensitive" } },
            { bankName: { contains: search, mode: "insensitive" } },
            { notes: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [checks, totalCount] = await Promise.all([
    prisma.payrollPaymentCheck.findMany({
      where,
      include: {
        bankAccount: true,
        payrollRun: {
          include: {
            payrollPeriod: true,
          },
        },
        finalPayRun: {
          include: {
            employee: true,
          },
        },
        statutoryPaymentRecord: true,
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
      orderBy: { checkDate: "desc" },
      take,
      skip,
    }),
    prisma.payrollPaymentCheck.count({ where }),
  ]);

  // Aggregate stats
  const totalAmount = checks.reduce((sum, c) => sum + Number(c.amount), 0);

  return {
    checks,
    totalCount,
    totalAmount,
  };
}
