import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { computePayroll, type AllowanceInput } from "@/lib/payroll/engine";
import { estimateMonthlyEquivalentCompensation } from "@/lib/payroll/estimateMonthlyEquivalent";
import type { ActiveLoanInput } from "@/lib/payroll/deductions/computeLoanDeductions";
import type { TimesheetFact } from "@/lib/payroll/attendance/types";
import type { HolidayType, PayBasis, PayPeriodType } from "@/lib/payroll/types";
import { EmploymentStatus, LoanStatus, PeriodType } from "@/lib/generated/prisma/enums";

function asOfWhere(asOf: Date) {
  return { effectiveFrom: { lte: asOf }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOf } }] };
}

export class PayrollRunError extends Error {}

export async function computeAndPersistPayrollRun({
  companyId,
  cutoffStart,
  cutoffEnd,
  payDate,
  periodType,
  computedByUserId,
}: {
  companyId: string;
  cutoffStart: Date;
  cutoffEnd: Date;
  payDate: Date;
  periodType: PeriodType;
  computedByUserId: string;
}) {
  const period = await prisma.payrollPeriod.upsert({
    where: { companyId_cutoffStart_cutoffEnd: { companyId, cutoffStart, cutoffEnd } },
    update: {},
    create: { companyId, cutoffStart, cutoffEnd, payDate, periodType },
  });

  const [company, sssBrackets, philhealthConfig, pagibigBracket, birBrackets, deMinimisCeilings] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.sssContributionBracket.findMany({ where: asOfWhere(cutoffEnd) }),
    prisma.philhealthConfig.findFirst({ where: asOfWhere(cutoffEnd), orderBy: { effectiveFrom: "desc" } }),
    prisma.pagibigContributionBracket.findFirst({ where: asOfWhere(cutoffEnd), orderBy: { effectiveFrom: "desc" } }),
    prisma.birWithholdingBracket.findMany({
      where: { ...asOfWhere(cutoffEnd), payPeriodType: "SEMI_MONTHLY" },
    }),
    prisma.deMinimisCeiling.findMany({ where: asOfWhere(cutoffEnd) }),
  ]);

  if (!philhealthConfig || !pagibigBracket || sssBrackets.length === 0 || birBrackets.length === 0) {
    throw new PayrollRunError(
      "Statutory rate tables are incomplete for this period — a platform admin must configure rates before payroll can run."
    );
  }

  const companyWorkDays = (company?.standardWorkDaysPerMonth ?? 22).toString();
  const deMinimisCeilingMap = new Map(deMinimisCeilings.map((c) => [c.category, c]));

  const employees = await prisma.employee.findMany({
    where: {
      companyId,
      employmentStatus: { in: [EmploymentStatus.PROBATIONARY, EmploymentStatus.REGULAR] },
    },
    include: {
      compensationRecords: {
        orderBy: { effectiveFrom: "desc" },
        include: { allowances: true },
      },
      timesheetEntries: { where: { workDate: { gte: cutoffStart, lte: cutoffEnd } } },
      loans: { where: { status: LoanStatus.ACTIVE }, orderBy: { startDate: "asc" } },
    },
  });

  const timing = company?.statutoryDeductionTiming ?? "SECOND_HALF";
  let isStatutoryDeductionCutoff = false;
  let statutoryDeductionScale = 1;

  if (timing === "FIRST_HALF") {
    isStatutoryDeductionCutoff = periodType === PeriodType.FIRST_HALF;
  } else if (timing === "SPLIT") {
    isStatutoryDeductionCutoff = true;
    statutoryDeductionScale = 0.5;
  } else {
    // SECOND_HALF (default)
    isStatutoryDeductionCutoff = periodType === PeriodType.SECOND_HALF;
  }

  const statutoryRateSnapshot = {
    sssBracketIds: sssBrackets.map((b) => b.id),
    philhealthConfigId: philhealthConfig.id,
    pagibigBracketId: pagibigBracket.id,
    birBracketIds: birBrackets.map((b) => b.id),
    deMinimisCeilingIds: deMinimisCeilings.map((c) => c.id),
    asOf: cutoffEnd.toISOString(),
  };

  const rateInputs = {
    sssBrackets: sssBrackets.map((b) => ({
      mscFloor: b.mscFloor.toString(),
      mscCeiling: b.mscCeiling.toString(),
      msc: b.msc.toString(),
      eeShare: b.eeShare.toString(),
      erShare: b.erShare.toString(),
      mpfEeShare: b.mpfEeShare?.toString() ?? "0",
      mpfErShare: b.mpfErShare?.toString() ?? "0",
      ecAmount: b.ecAmount.toString(),
    })),
    philhealthConfig: {
      premiumRate: philhealthConfig.premiumRate.toString(),
      eeShareRate: philhealthConfig.eeShareRate.toString(),
      erShareRate: philhealthConfig.erShareRate.toString(),
      floorSalary: philhealthConfig.floorSalary.toString(),
      ceilingSalary: philhealthConfig.ceilingSalary.toString(),
    },
    pagibigBracket: {
      salaryThreshold: pagibigBracket.salaryThreshold.toString(),
      eeRateBelowThreshold: pagibigBracket.eeRateBelowThreshold.toString(),
      erRateBelowThreshold: pagibigBracket.erRateBelowThreshold.toString(),
      eeRateAboveThreshold: pagibigBracket.eeRateAboveThreshold.toString(),
      erRateAboveThreshold: pagibigBracket.erRateAboveThreshold.toString(),
      maxFundSalary: pagibigBracket.maxFundSalary.toString(),
      eeCap: pagibigBracket.eeCap.toString(),
      erCap: pagibigBracket.erCap.toString(),
    },
    birBrackets: birBrackets.map((b) => ({
      payPeriodType: b.payPeriodType as PayPeriodType,
      bracketFloor: b.bracketFloor.toString(),
      bracketCeiling: b.bracketCeiling?.toString() ?? null,
      baseTax: b.baseTax.toString(),
      excessRate: b.excessRate.toString(),
    })),
  };

  const existingActiveRun = await prisma.payrollRun.findFirst({
    where: {
      companyId,
      payrollPeriodId: period.id,
      status: { in: ["DRAFT", "PENDING_APPROVAL", "APPROVED"] },
    },
  });
  if (existingActiveRun) {
    throw new PayrollRunError(
      `An active payroll run (#${existingActiveRun.runNumber}) for this cutoff period already exists (${existingActiveRun.status}). Please review or void the existing run in Payroll History.`
    );
  }

  const lastRun = await prisma.payrollRun.findFirst({
    where: { companyId },
    orderBy: { runNumber: "desc" },
  });
  const runNumber = (lastRun?.runNumber ?? 0) + 1;

  const runId = await prisma.$transaction(async (tx) => {
    const run = await tx.payrollRun.create({
      data: {
        companyId,
        payrollPeriodId: period.id,
        status: "DRAFT",
        runNumber,
        computedAt: new Date(),
        computedByUserId,
        statutoryRateSnapshot,
      },
    });

    // Pure computation pass — no DB calls — so the DB writes below can be batched
    // instead of awaited one employee at a time inside the open transaction.
    const computed: { employeeId: string; result: ReturnType<typeof computePayroll> }[] = [];

    for (const emp of employees) {
      const comp = emp.compensationRecords.find(
        (c) => c.effectiveFrom <= cutoffEnd && (c.effectiveTo === null || c.effectiveTo > cutoffEnd)
      ) ?? emp.compensationRecords[0];
      if (!comp) continue; // no compensation record found — skip

      const timesheets: TimesheetFact[] = emp.timesheetEntries.map((t) => ({
        workDate: t.workDate.toISOString(),
        status: t.status,
        regularHours: t.regularHours.toString(),
        overtimeHours: t.overtimeHours.toString(),
        nightDiffHours: t.nightDiffHours.toString(),
        lateMinutes: t.lateMinutes,
        undertimeMinutes: t.undertimeMinutes,
        holidayType: (t.holidayType as HolidayType | null) ?? null,
        isRestDay: t.isRestDay,
      }));

      const allowances: AllowanceInput[] = comp.allowances.map((a) => {
        const ceiling = a.deMinimisCategory ? deMinimisCeilingMap.get(a.deMinimisCategory) : null;
        return {
          label: a.label,
          amount: a.amount.toString(),
          isTaxable: a.isTaxable,
          isDeMinimis: a.isDeMinimis,
          deMinimisCategory: a.deMinimisCategory,
          deMinimisCeilingAmount: ceiling ? ceiling.ceilingAmount.toString() : null,
          deMinimisFrequency: ceiling ? ceiling.frequency : null,
        };
      });

      const monthlyEquivalentCompensation = estimateMonthlyEquivalentCompensation(
        comp.payBasis as PayBasis,
        comp.basicRate.toString(),
        comp.standardWorkDaysPerMonth?.toString() || companyWorkDays
      );

      const activeLoans: ActiveLoanInput[] = emp.loans.map((l) => ({
        id: l.id,
        description: `${l.name} (${l.category.replaceAll("_", " ")})`,
        installmentAmount: l.installmentAmount.toString(),
        remainingBalance: l.remainingBalance.toString(),
        deductionFrequency: l.deductionFrequency,
      }));

      const result = computePayroll({
        payBasis: comp.payBasis as PayBasis,
        basicRate: comp.basicRate.toString(),
        standardWorkDaysPerMonth: comp.standardWorkDaysPerMonth?.toString() || companyWorkDays,
        isManagerialExempt: emp.isManagerialExempt,
        timesheets,
        allowances,
        isSemiMonthly: periodType === PeriodType.FIRST_HALF || periodType === PeriodType.SECOND_HALF,
        isStatutoryDeductionCutoff,
        statutoryDeductionScale,
        monthlyEquivalentCompensation: monthlyEquivalentCompensation.toString(),
        rates: rateInputs,
        activeLoans,
      });

      computed.push({ employeeId: emp.id, result });
    }

    if (computed.length > 0) {
      const createdPayslips = await tx.payslip.createManyAndReturn({
        data: computed.map(({ employeeId, result }) => ({
          payrollRunId: run.id,
          employeeId,
          companyId,
          grossPay: result.grossPay.toFixed(2),
          totalStatutoryDeductions: result.totalStatutoryDeductions.toFixed(2),
          totalOtherDeductions: result.totalOtherDeductions.toFixed(2),
          netPay: result.netPay.toFixed(2),
        })),
        select: { id: true, employeeId: true },
      });
      const payslipIdByEmployeeId = new Map(createdPayslips.map((p) => [p.employeeId, p.id]));
      const employeeByIdMap = new Map(employees.map((e) => [e.id, e]));

      // Fetch company bank accounts for multi-bank disbursement matching
      const companyBanks = await tx.companyBankAccount.findMany({
        where: { companyId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      });
      const defaultCompanyBank = companyBanks.find((b) => b.isDefault) ?? companyBanks[0];
      const secondaryCompanyBank = companyBanks[1] ?? defaultCompanyBank;

      const bankDisbursementsData: Array<{
        payslipId: string;
        companyBankAccountId: string | null;
        employeeBankName: string;
        employeeAccountNumber: string;
        amount: string;
        label: string;
      }> = [];

      for (const { employeeId, result } of computed) {
        const payslipId = payslipIdByEmployeeId.get(employeeId);
        const emp = employeeByIdMap.get(employeeId);
        if (!payslipId || !emp) continue;

        const netPay = result.netPay.toNumber();
        if (netPay <= 0) continue;

        const primaryCompBankId = emp.primaryCompanyBankId || defaultCompanyBank?.id || null;
        const secondaryCompBankId = emp.secondaryCompanyBankId || secondaryCompanyBank?.id || null;

        let secondaryAmount = 0;
        if (emp.secondaryBankName && emp.secondaryBankAccountNumber && emp.bankSplitRule !== "NONE") {
          if (emp.bankSplitRule === "FIXED_AMOUNT" && emp.bankSplitValue) {
            secondaryAmount = Math.min(netPay, Number(emp.bankSplitValue));
          } else if (emp.bankSplitRule === "PERCENTAGE" && emp.bankSplitValue) {
            const pct = Math.min(100, Math.max(0, Number(emp.bankSplitValue)));
            secondaryAmount = Math.round((netPay * (pct / 100)) * 100) / 100;
          } else if (emp.bankSplitRule === "ALLOWANCES_ONLY") {
            const allowanceTotal = result.lineItems
              .filter((li) => li.category === "ALLOWANCE")
              .reduce((sum, li) => sum + li.amount.toNumber(), 0);
            secondaryAmount = Math.min(netPay, allowanceTotal);
          }
        }

        const primaryAmount = netPay - secondaryAmount;

        if (primaryAmount > 0) {
          bankDisbursementsData.push({
            payslipId,
            companyBankAccountId: primaryCompBankId,
            employeeBankName: emp.bankName || "Cash / ATM",
            employeeAccountNumber: emp.bankAccountNumber || "—",
            amount: primaryAmount.toFixed(2),
            label: "PRIMARY",
          });
        }

        if (secondaryAmount > 0) {
          bankDisbursementsData.push({
            payslipId,
            companyBankAccountId: secondaryCompBankId,
            employeeBankName: emp.secondaryBankName!,
            employeeAccountNumber: emp.secondaryBankAccountNumber!,
            amount: secondaryAmount.toFixed(2),
            label: "SECONDARY",
          });
        }
      }

      if (bankDisbursementsData.length > 0) {
        await tx.payslipBankDisbursement.createMany({ data: bankDisbursementsData });
      }

      const lineItemsData = computed.flatMap(({ employeeId, result }) => {
        const payslipId = payslipIdByEmployeeId.get(employeeId);
        if (!payslipId) throw new PayrollRunError(`Payslip was not created for employee ${employeeId}`);
        return result.lineItems.map((li) => ({
          payslipId,
          category: li.category,
          direction: li.direction,
          description: li.description,
          amount: li.amount.toFixed(2),
          quantity: li.quantity ? li.quantity.toFixed(2) : null,
          sourceRef: li.loanId
            ? { loanId: li.loanId }
            : (li.sourceRef as Prisma.InputJsonObject | undefined),
        }));
      });
      if (lineItemsData.length > 0) {
        await tx.payrollLineItem.createMany({ data: lineItemsData });
      }

      // Persist the loan audit trail and update each loan's cached balance —
      // LoanDeduction rows are the source of truth; Loan.remainingBalance is
      // always reconcilable by replaying them.
      const allLoanDeductions = computed.flatMap(({ result }) => result.loanDeductions);
      if (allLoanDeductions.length > 0) {
        await tx.loanDeduction.createMany({
          data: allLoanDeductions.map((ld) => ({
            loanId: ld.loanId,
            payrollRunId: run.id,
            cutoffDate: cutoffEnd,
            amountDeducted: ld.amountDeducted.toFixed(2),
            balanceAfter: ld.balanceAfter.toFixed(2),
          })),
        });

        await Promise.all(
          allLoanDeductions.map((ld) =>
            tx.loan.update({
              where: { id: ld.loanId },
              data: {
                remainingBalance: ld.balanceAfter.toFixed(2),
                status: ld.balanceAfter.lte(0) ? LoanStatus.COMPLETED : LoanStatus.ACTIVE,
              },
            })
          )
        );
      }
    }

    return run.id;
  });

  return runId;
}
