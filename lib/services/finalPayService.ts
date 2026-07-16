import { prisma } from "@/lib/db";
import { computeFinalPay } from "@/lib/finalpay/computeFinalPay";
import { computeYearsOfServiceCredited } from "@/lib/finalpay/computeYearsOfServiceCredited";
import { computeBasePay } from "@/lib/payroll/attendance/computeBasePay";
import { estimateMonthlyEquivalentCompensation } from "@/lib/payroll/estimateMonthlyEquivalent";
import { estimateDailyRateEquivalent } from "@/lib/payroll/estimateDailyRateEquivalent";
import type { FinalPaySeparationCategory } from "@/lib/finalpay/types";
import type { TimesheetFact } from "@/lib/payroll/attendance/types";
import type { PayBasis } from "@/lib/payroll/types";

export class FinalPayError extends Error {}

function asOfWhere(asOf: Date) {
  return { effectiveFrom: { lte: asOf }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOf } }] };
}

export async function computeAndPersistFinalPayRun({
  companyId,
  employeeId,
  computedByUserId,
}: {
  companyId: string;
  employeeId: string;
  computedByUserId: string;
}) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      compensationRecords: { orderBy: { effectiveFrom: "desc" } },
      loans: { where: { status: "ACTIVE" } },
      leaveBalances: { include: { leaveType: true } },
      payslips: { include: { payrollRun: { include: { payrollPeriod: true } }, lineItems: true } },
    },
  });
  if (!employee || employee.companyId !== companyId) {
    throw new FinalPayError("Employee not found");
  }
  if (!employee.dateSeparated || !employee.separationCategory) {
    throw new FinalPayError(
      "Employee must have a separation date and category set before final pay can be computed"
    );
  }

  const existingActiveRun = await prisma.finalPayRun.findFirst({
    where: { employeeId, status: { in: ["DRAFT", "APPROVED", "POSTED"] } },
  });
  if (existingActiveRun) {
    throw new FinalPayError(
      `A final pay run already exists for this employee (status: ${existingActiveRun.status}) — void it before computing a new one`
    );
  }

  const dateSeparated = employee.dateSeparated;
  const yearStart = new Date(Date.UTC(dateSeparated.getUTCFullYear(), 0, 1));

  const comp = employee.compensationRecords.find(
    (c) => c.effectiveFrom <= dateSeparated && (c.effectiveTo === null || c.effectiveTo > dateSeparated)
  );
  if (!comp) {
    throw new FinalPayError("Employee has no compensation record active as of the separation date");
  }

  const monthlyEquivalentRate = estimateMonthlyEquivalentCompensation(
    comp.payBasis as PayBasis,
    comp.basicRate.toString(),
    comp.standardWorkDaysPerMonth?.toString()
  );
  const dailyRateEquivalent = estimateDailyRateEquivalent(
    comp.payBasis as PayBasis,
    comp.basicRate.toString(),
    comp.standardWorkDaysPerMonth?.toString()
  );

  const yearsOfServiceCredited = computeYearsOfServiceCredited(employee.dateHired, dateSeparated);

  // Unpaid wages: timesheet entries after the last POSTED payslip's cutoff,
  // up to the separation date — reuses the same pure computeBasePay the
  // regular payroll engine uses, just for a one-off partial period.
  const postedPayslips = employee.payslips.filter((p) => p.payrollRun.status === "POSTED");
  const lastPostedCutoffEnd =
    postedPayslips.length > 0
      ? postedPayslips.reduce(
          (latest, p) =>
            p.payrollRun.payrollPeriod.cutoffEnd > latest ? p.payrollRun.payrollPeriod.cutoffEnd : latest,
          postedPayslips[0].payrollRun.payrollPeriod.cutoffEnd
        )
      : new Date(employee.dateHired.getTime() - 24 * 60 * 60 * 1000);

  const finalCutoffTimesheets = await prisma.timesheetEntry.findMany({
    where: { employeeId, workDate: { gt: lastPostedCutoffEnd, lte: dateSeparated } },
  });
  const finalCutoffFacts: TimesheetFact[] = finalCutoffTimesheets.map((t) => ({
    workDate: t.workDate.toISOString(),
    status: t.status,
    regularHours: t.regularHours.toString(),
    overtimeHours: t.overtimeHours.toString(),
    nightDiffHours: t.nightDiffHours.toString(),
    lateMinutes: t.lateMinutes,
    undertimeMinutes: t.undertimeMinutes,
    holidayType: t.holidayType,
    isRestDay: t.isRestDay,
  }));
  const unpaidWages = computeBasePay({
    payBasis: comp.payBasis as PayBasis,
    basicRate: comp.basicRate.toString(),
    standardWorkDaysPerMonth: comp.standardWorkDaysPerMonth?.toString(),
    timesheets: finalCutoffFacts,
  });

  // Unused convertible leave, current year
  const currentYear = dateSeparated.getUTCFullYear();
  const unusedConvertibleLeaveDays = employee.leaveBalances
    .filter((b) => b.year === currentYear && b.leaveType.isConvertibleToCash)
    .reduce((sum, b) => {
      const remaining =
        b.entitledDays.toNumber() + b.carriedOverDays.toNumber() + b.adjustedDays.toNumber() - b.usedDays.toNumber();
      return sum + Math.max(remaining, 0);
    }, 0);

  // Year-to-date figures from posted payslips this calendar year
  const ytdPayslips = postedPayslips.filter((p) => p.payrollRun.payrollPeriod.cutoffStart >= yearStart);
  const basicSalaryEarnedThisYear = ytdPayslips.reduce(
    (sum, p) =>
      sum + p.lineItems.filter((li) => li.category === "BASIC_PAY").reduce((s, li) => s + li.amount.toNumber(), 0),
    0
  );
  const priorTaxableCompensationForYear = ytdPayslips.reduce((sum, p) => {
    const statutoryEe = p.lineItems
      .filter((li) => ["SSS_EE", "PHILHEALTH_EE", "PAGIBIG_EE"].includes(li.category))
      .reduce((s, li) => s + li.amount.toNumber(), 0);
    return sum + p.grossPay.toNumber() - statutoryEe;
  }, 0);
  const cumulativeTaxWithheldForYear = ytdPayslips.reduce(
    (sum, p) =>
      sum +
      p.lineItems.filter((li) => li.category === "WITHHOLDING_TAX").reduce((s, li) => s + li.amount.toNumber(), 0),
    0
  );

  const outstandingLoanBalance = employee.loans.reduce((sum, l) => sum + l.remainingBalance.toNumber(), 0);

  const [thirteenthMonthConfig, annualBrackets] = await Promise.all([
    prisma.thirteenthMonthConfig.findFirst({
      where: asOfWhere(dateSeparated),
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.birWithholdingBracket.findMany({
      where: { ...asOfWhere(dateSeparated), payPeriodType: "ANNUAL" },
    }),
  ]);
  if (!thirteenthMonthConfig || annualBrackets.length === 0) {
    throw new FinalPayError(
      "Statutory rate tables (13th month ceiling / annual BIR brackets) are incomplete — a platform admin must configure rates before final pay can be computed."
    );
  }

  const statutoryRateSnapshot = {
    thirteenthMonthConfigId: thirteenthMonthConfig.id,
    annualBracketIds: annualBrackets.map((b) => b.id),
    asOf: dateSeparated.toISOString(),
  };

  const result = computeFinalPay({
    separationCategory: employee.separationCategory as FinalPaySeparationCategory,
    monthlyEquivalentRate: monthlyEquivalentRate.toString(),
    dailyRateEquivalent: dailyRateEquivalent.toString(),
    yearsOfServiceCredited,
    unpaidWagesAmount: unpaidWages.basePay.toString(),
    unusedConvertibleLeaveDays,
    basicSalaryEarnedThisYear,
    thirteenthMonthExemptionCeiling: thirteenthMonthConfig.exemptionCeiling.toString(),
    outstandingLoanBalance,
    priorTaxableCompensationForYear,
    cumulativeTaxWithheldForYear,
    annualBrackets: annualBrackets.map((b) => ({
      payPeriodType: "ANNUAL" as const,
      bracketFloor: b.bracketFloor.toString(),
      bracketCeiling: b.bracketCeiling?.toString() ?? null,
      baseTax: b.baseTax.toString(),
      excessRate: b.excessRate.toString(),
    })),
  });

  const lastRun = await prisma.finalPayRun.findFirst({
    where: { companyId },
    orderBy: { finalPayNumber: "desc" },
  });
  const finalPayNumber = (lastRun?.finalPayNumber ?? 0) + 1;

  const finalPayRunId = await prisma.$transaction(async (tx) => {
    const run = await tx.finalPayRun.create({
      data: {
        companyId,
        employeeId,
        finalPayNumber,
        status: "DRAFT",
        separationDate: dateSeparated,
        separationCategory: employee.separationCategory!,
        computedAt: new Date(),
        computedByUserId,
        statutoryRateSnapshot,
        grossFinalPay: result.grossFinalPay.toFixed(2),
        totalDeductions: result.totalDeductions.toFixed(2),
        netFinalPay: result.netFinalPay.toFixed(2),
        lineItems: {
          create: result.lineItems.map((li) => ({
            category: li.category,
            direction: li.direction,
            description: li.description,
            amount: li.amount.toFixed(2),
            isTaxExempt: li.isTaxExempt,
            // Snapshot exactly which loans (and at what balance) this payoff
            // figure was computed from — posting settles precisely these,
            // not whatever the employee's active loans happen to be later.
            sourceRef:
              li.category === "LOAN_PAYOFF"
                ? { loans: employee.loans.map((l) => ({ id: l.id, amount: l.remainingBalance.toString() })) }
                : undefined,
          })),
        },
      },
    });
    return run.id;
  });

  return finalPayRunId;
}
