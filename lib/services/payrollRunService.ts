import { prisma } from "@/lib/db";
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

  const [sssBrackets, philhealthConfig, pagibigBracket, birBrackets] = await Promise.all([
    prisma.sssContributionBracket.findMany({ where: asOfWhere(cutoffEnd) }),
    prisma.philhealthConfig.findFirst({ where: asOfWhere(cutoffEnd), orderBy: { effectiveFrom: "desc" } }),
    prisma.pagibigContributionBracket.findFirst({ where: asOfWhere(cutoffEnd), orderBy: { effectiveFrom: "desc" } }),
    prisma.birWithholdingBracket.findMany({
      where: { ...asOfWhere(cutoffEnd), payPeriodType: "SEMI_MONTHLY" },
    }),
  ]);

  if (!philhealthConfig || !pagibigBracket || sssBrackets.length === 0 || birBrackets.length === 0) {
    throw new PayrollRunError(
      "Statutory rate tables are incomplete for this period — a platform admin must configure rates before payroll can run."
    );
  }

  const employees = await prisma.employee.findMany({
    where: {
      companyId,
      employmentStatus: { in: [EmploymentStatus.PROBATIONARY, EmploymentStatus.REGULAR] },
    },
    include: {
      compensationRecords: {
        where: asOfWhere(cutoffEnd),
        orderBy: { effectiveFrom: "desc" },
        take: 1,
        include: { allowances: true },
      },
      timesheetEntries: { where: { workDate: { gte: cutoffStart, lte: cutoffEnd } } },
      loans: { where: { status: LoanStatus.ACTIVE }, orderBy: { startDate: "asc" } },
    },
  });

  const isStatutoryDeductionCutoff = periodType === PeriodType.SECOND_HALF;

  const statutoryRateSnapshot = {
    sssBracketIds: sssBrackets.map((b) => b.id),
    philhealthConfigId: philhealthConfig.id,
    pagibigBracketId: pagibigBracket.id,
    birBracketIds: birBrackets.map((b) => b.id),
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
      const comp = emp.compensationRecords[0];
      if (!comp) continue; // no active compensation record as of this cutoff — skip

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

      const allowances: AllowanceInput[] = comp.allowances.map((a) => ({
        label: a.label,
        amount: a.amount.toString(),
        isTaxable: a.isTaxable,
      }));

      const monthlyEquivalentCompensation = estimateMonthlyEquivalentCompensation(
        comp.payBasis as PayBasis,
        comp.basicRate.toString(),
        comp.standardWorkDaysPerMonth?.toString()
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
        standardWorkDaysPerMonth: comp.standardWorkDaysPerMonth?.toString(),
        isManagerialExempt: emp.isManagerialExempt,
        timesheets,
        allowances,
        isStatutoryDeductionCutoff,
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
          sourceRef: li.loanId ? { loanId: li.loanId } : undefined,
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
