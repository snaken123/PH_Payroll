import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { Decimal } from "decimal.js";
import { computePayroll, type AllowanceInput } from "@/lib/payroll/engine";
import { estimateMonthlyEquivalentCompensation } from "@/lib/payroll/estimateMonthlyEquivalent";
import type { ActiveLoanInput } from "@/lib/payroll/deductions/computeLoanDeductions";
import type { TimesheetFact } from "@/lib/payroll/attendance/types";
import type { HolidayType, PayBasis, PayPeriodType } from "@/lib/payroll/types";
import { EmploymentStatus, LoanStatus, PeriodType } from "@/lib/generated/prisma/enums";
import { calculateTimesheetHours, type CompanyAttendanceConfig } from "@/lib/attendance/calculateHours";
import { extractTimeOfDay } from "@/lib/validations/attendance";

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
  replacesRunId,
  approvedOtEmployeeIds,
  approvedOtHoursMap,
  ignoredUndertimeEmployeeIds,
  excludeSaturdayTardiness = false,
  excludeSaturdayUndertime = false,
  targetRunId,
}: {
  companyId: string;
  cutoffStart: Date;
  cutoffEnd: Date;
  payDate: Date;
  periodType: PeriodType;
  computedByUserId: string;
  replacesRunId?: string;
  approvedOtEmployeeIds?: string[];
  approvedOtHoursMap?: Record<string, number>;
  ignoredUndertimeEmployeeIds?: string[];
  excludeSaturdayTardiness?: boolean;
  excludeSaturdayUndertime?: boolean;
  targetRunId?: string;
}) {
  const cutoffStartStartOfDay = new Date(cutoffStart);
  cutoffStartStartOfDay.setUTCHours(0, 0, 0, 0);

  const cutoffEndEndOfDay = new Date(cutoffEnd);
  cutoffEndEndOfDay.setUTCHours(23, 59, 59, 999);

  const period = await prisma.payrollPeriod.upsert({
    where: { companyId_cutoffStart_cutoffEnd: { companyId, cutoffStart, cutoffEnd } },
    update: {},
    create: { companyId, cutoffStart, cutoffEnd, payDate, periodType },
  });

  const [company, sssBrackets, philhealthConfig, pagibigBracket, birBrackets, deMinimisCeilings, specialDaySchedules] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.sssContributionBracket.findMany({ where: asOfWhere(cutoffEndEndOfDay) }),
    prisma.philhealthConfig.findFirst({ where: asOfWhere(cutoffEndEndOfDay), orderBy: { effectiveFrom: "desc" } }),
    prisma.pagibigContributionBracket.findFirst({ where: asOfWhere(cutoffEndEndOfDay), orderBy: { effectiveFrom: "desc" } }),
    prisma.birWithholdingBracket.findMany({
      where: { ...asOfWhere(cutoffEndEndOfDay), payPeriodType: "SEMI_MONTHLY" },
    }),
    prisma.deMinimisCeiling.findMany({ where: asOfWhere(cutoffEndEndOfDay) }),
    prisma.specialDaySchedule.findMany({
      where: {
        companyId,
        workDate: { gte: cutoffStartStartOfDay, lte: cutoffEndEndOfDay },
      },
    }),
  ]);

  if (!philhealthConfig || !pagibigBracket || sssBrackets.length === 0 || birBrackets.length === 0) {
    throw new PayrollRunError(
      "Statutory rate tables are incomplete for this period — a platform admin must configure rates before payroll can run."
    );
  }

  const specialDayMap = new Map<string, (typeof specialDaySchedules)[0]>();
  for (const s of specialDaySchedules) {
    const dStr = s.workDate instanceof Date ? s.workDate.toISOString().slice(0, 10) : String(s.workDate).slice(0, 10);
    specialDayMap.set(dStr, s);
  }

  const attendanceConfig: CompanyAttendanceConfig = {
    attendanceStandardTimeIn: company?.attendanceStandardTimeIn,
    attendanceStandardTimeOut: company?.attendanceStandardTimeOut,
    attendanceLunchBreakMinutes: company?.attendanceLunchBreakMinutes,
    attendanceLateGracePeriodMinutes: company?.attendanceLateGracePeriodMinutes,
    attendanceOtGracePeriodMinutes: company?.attendanceOtGracePeriodMinutes,
    attendanceFlexi1WindowStart: company?.attendanceFlexi1WindowStart,
    attendanceFlexi1WindowEnd: company?.attendanceFlexi1WindowEnd,
    attendanceFlexi1LateGracePeriodMinutes: company?.attendanceFlexi1LateGracePeriodMinutes,
    attendanceSaturdayRuleEnabled: company?.attendanceSaturdayRuleEnabled,
    attendanceSaturdayWindowStart: company?.attendanceSaturdayWindowStart,
    attendanceSaturdayWindowEnd: company?.attendanceSaturdayWindowEnd,
    attendanceSaturdayGracePeriodMinutes: company?.attendanceSaturdayGracePeriodMinutes,
    attendanceSaturdayShiftHours: company?.attendanceSaturdayShiftHours,
    attendanceSaturdayBreakMinutes: company?.attendanceSaturdayBreakMinutes,
    attendanceSaturdayEmployeeIds: Array.isArray(company?.attendanceSaturdayEmployeeIds)
      ? (company?.attendanceSaturdayEmployeeIds as string[])
      : null,
  };

  const companyWorkDays = (company?.standardWorkDaysPerMonth ?? 26).toString();
  const deMinimisCeilingMap = new Map(deMinimisCeilings.map((c) => [c.category, c]));

  const employees = await prisma.employee.findMany({
    where: {
      companyId,
      isDeleted: false,
      dateHired: { lte: cutoffEndEndOfDay },
      OR: [
        {
          employmentStatus: { in: [EmploymentStatus.PROBATIONARY, EmploymentStatus.REGULAR, EmploymentStatus.RETAINER] },
          OR: [{ dateSeparated: null }, { dateSeparated: { gt: cutoffEndEndOfDay } }],
        },
        {
          dateSeparated: { gt: cutoffEndEndOfDay },
        },
      ],
    },
    include: {
      compensationRecords: {
        orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
        include: { allowances: true },
      },
      timesheetEntries: { where: { workDate: { gte: cutoffStartStartOfDay, lte: cutoffEndEndOfDay } } },
      loans: { where: { status: LoanStatus.ACTIVE, startDate: { lte: cutoffEndEndOfDay } }, orderBy: { startDate: "asc" } },
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
      status: { in: ["DRAFT", "PENDING_APPROVAL"] },
      ...(targetRunId ? { id: { not: targetRunId } } : {}),
    },
  });
  if (existingActiveRun) {
    throw new PayrollRunError(
      `An active draft/pending payroll run (#${existingActiveRun.runNumber}) for this cutoff period already exists (${existingActiveRun.status}). Please review or void the existing draft run in Payroll History.`
    );
  }

  const runId = await prisma.$transaction(async (tx) => {
    if (targetRunId) {
      await tx.payslip.deleteMany({ where: { payrollRunId: targetRunId } });
      await tx.loanDeduction.deleteMany({ where: { payrollRunId: targetRunId } });
    }

    let run;
    if (targetRunId) {
      run = await tx.payrollRun.update({
        where: { id: targetRunId },
        data: {
          computedAt: new Date(),
          computedByUserId,
          statutoryRateSnapshot,
        },
      });
    } else {
      const lastRun = await tx.payrollRun.findFirst({
        where: { companyId },
        orderBy: { runNumber: "desc" },
      });
      const runNumber = (lastRun?.runNumber ?? 0) + 1;
      run = await tx.payrollRun.create({
        data: {
          companyId,
          payrollPeriodId: period.id,
          status: "DRAFT",
          runNumber,
          computedAt: new Date(),
          computedByUserId,
          replacesRunId: replacesRunId ?? null,
          statutoryRateSnapshot,
        },
      });
    }

    // Pure computation pass — no DB calls — so the DB writes below can be batched
    // instead of awaited one employee at a time inside the open transaction.
    const computed: { employeeId: string; result: ReturnType<typeof computePayroll> }[] = [];

    for (const emp of employees) {
      const comp = emp.compensationRecords.find(
        (c) => c.effectiveFrom <= cutoffEndEndOfDay && (c.effectiveTo === null || c.effectiveTo > cutoffEndEndOfDay)
      ) ?? emp.compensationRecords[0];
      if (!comp) continue; // no compensation record found — skip

      const isUndertimeIgnored = ignoredUndertimeEmployeeIds?.includes(emp.id) ?? false;

      const evaluatedEntries = emp.timesheetEntries.map((t) => {
        let rawLateMinutes = t.lateMinutes;
        let rawUndertimeMinutes = t.undertimeMinutes;
        let rawRegularHours = Number(t.regularHours);
        let rawOvertimeHours = Number(t.overtimeHours);

        if (t.status === "ABSENT") {
          rawLateMinutes = 0;
          rawUndertimeMinutes = 0;
          rawRegularHours = 0;
          rawOvertimeHours = 0;
        } else if (t.source === "MANUAL") {
          // Respect user manual attendance edits directly
          rawLateMinutes = t.lateMinutes;
          rawUndertimeMinutes = t.undertimeMinutes;
          rawRegularHours = Number(t.regularHours);
          rawOvertimeHours = Number(t.overtimeHours);
        } else if (t.status === "PRESENT" || t.timeIn || t.timeOut) {
          const workDateStr = t.workDate.toISOString().slice(0, 10);
          const timeInStr = extractTimeOfDay(t.timeIn);
          const timeOutStr = extractTimeOfDay(t.timeOut);
          const specialDay = specialDayMap.get(workDateStr);

          const calc = calculateTimesheetHours({
            workDate: workDateStr,
            employeeId: emp.id,
            scheduleType: emp.scheduleType,
            timeIn: timeInStr,
            timeOut: timeOutStr,
            config: {
              ...attendanceConfig,
              specialDaySchedule: specialDay
                ? {
                    standardTimeIn: specialDay.standardTimeIn,
                    standardTimeOut: specialDay.standardTimeOut,
                    lunchBreakMinutes: specialDay.lunchBreakMinutes,
                    lateGracePeriodMinutes: specialDay.lateGracePeriodMinutes,
                    otGracePeriodMinutes: specialDay.otGracePeriodMinutes,
                  }
                : null,
            },
          });

          rawLateMinutes = calc.lateMinutes;
          rawUndertimeMinutes = calc.undertimeMinutes;
          rawRegularHours = calc.regularHours;
          rawOvertimeHours = calc.overtimeHours;
        }

        const isSaturday = new Date(t.workDate).getUTCDay() === 6;
        const ignoreSatLate = (excludeSaturdayTardiness ?? false) && isSaturday;
        const ignoreSatUndertime = (excludeSaturdayUndertime ?? false) && isSaturday;

        const effectiveLate = isUndertimeIgnored || ignoreSatLate ? 0 : rawLateMinutes;
        const effectiveUndertime = isUndertimeIgnored || ignoreSatUndertime ? 0 : rawUndertimeMinutes;

        // Restore regular hours if tardiness or undertime is waived/ignored
        // (since calculateHours pre-deducts them: regularHours = 8.0 - (late + ut)/60)
        let effectiveRegularHours = rawRegularHours;
        const waivedLateMinutes = rawLateMinutes - effectiveLate;
        const waivedUtMinutes = rawUndertimeMinutes - effectiveUndertime;
        const totalWaivedMinutes = waivedLateMinutes + waivedUtMinutes;

        if (totalWaivedMinutes > 0 && t.status !== "ABSENT") {
          effectiveRegularHours = Math.min(8.0, Math.round((effectiveRegularHours + totalWaivedMinutes / 60) * 100) / 100);
          if (effectiveRegularHours > 7.95) {
            effectiveRegularHours = 8.0;
          }
        }

        return {
          workDate: t.workDate.toISOString(),
          status: t.status,
          regularHours: effectiveRegularHours.toString(),
          rawOvertimeHours,
          nightDiffHours: t.nightDiffHours.toString(),
          lateMinutes: effectiveLate,
          undertimeMinutes: effectiveUndertime,
          holidayType: (t.holidayType as HolidayType | null) ?? null,
          isRestDay: t.isRestDay,
        };
      });

      const totalLoggedOt = evaluatedEntries.reduce((sum, e) => sum + e.rawOvertimeHours, 0);
      let approvedOtRatio = 1;
      let hasCustomApprovedOt = false;
      let customApprovedOt = 0;

      if (approvedOtHoursMap !== undefined) {
        customApprovedOt = approvedOtHoursMap[emp.id] ?? 0;
        hasCustomApprovedOt = true;
        if (customApprovedOt <= 0 || totalLoggedOt <= 0) {
          approvedOtRatio = 0;
        } else {
          approvedOtRatio = customApprovedOt / totalLoggedOt;
        }
      } else if (approvedOtEmployeeIds !== undefined) {
        approvedOtRatio = approvedOtEmployeeIds.includes(emp.id) ? 1 : 0;
      }

      const timesheets: TimesheetFact[] = evaluatedEntries.map((e) => {
        let finalOt = "0";
        if (hasCustomApprovedOt && customApprovedOt > 0) {
          if (totalLoggedOt > 0) {
            finalOt = new Decimal(e.rawOvertimeHours).times(approvedOtRatio).toString();
          }
        } else {
          finalOt = (e.rawOvertimeHours * approvedOtRatio).toString();
        }

        return {
          workDate: e.workDate,
          status: e.status,
          regularHours: e.regularHours,
          overtimeHours: finalOt,
          nightDiffHours: e.nightDiffHours,
          lateMinutes: e.lateMinutes,
          undertimeMinutes: e.undertimeMinutes,
          holidayType: e.holidayType,
          isRestDay: e.isRestDay,
        };
      });

      if (hasCustomApprovedOt && customApprovedOt > 0 && totalLoggedOt <= 0 && timesheets.length > 0) {
        const firstPresent = timesheets.find((ts) => ts.status === "PRESENT") ?? timesheets[0];
        firstPresent.overtimeHours = customApprovedOt.toString();
      }

      const allowances: AllowanceInput[] = comp.allowances.map((a) => {
        const ceiling = a.deMinimisCategory ? deMinimisCeilingMap.get(a.deMinimisCategory) : null;
        return {
          label: a.label,
          amount: a.amount.toString(),
          frequency: a.frequency,
          isTaxable: a.isTaxable,
          isDeMinimis: a.isDeMinimis,
          deMinimisCategory: a.deMinimisCategory,
          deMinimisCeilingAmount: ceiling ? ceiling.ceilingAmount.toString() : null,
          deMinimisFrequency: ceiling ? ceiling.frequency : null,
          payingCompanyId: a.payingCompanyId ?? null,
        };
      });

      const monthlyEquivalentCompensation = estimateMonthlyEquivalentCompensation({
        payBasis: comp.payBasis as PayBasis,
        basicRate: comp.basicRate.toString(),
        standardWorkDaysPerMonth: comp.standardWorkDaysPerMonth?.toString() || companyWorkDays,
        allowances,
        currentCompanyId: companyId,
        includeOtherCompanyAllowancesInContributions: company?.includeOtherCompanyAllowancesInContributions ?? false,
      });

      const activeLoans: ActiveLoanInput[] = emp.loans.map((l) => ({
        id: l.id,
        description: `${l.name} (${l.category.replaceAll("_", " ")})`,
        installmentAmount: l.installmentAmount.toString(),
        remainingBalance: l.remainingBalance.toString(),
        deductionFrequency: l.deductionFrequency,
        hasNoExpiration: l.hasNoExpiration,
        endDate: l.endDate ? l.endDate.toISOString().split("T")[0] : null,
      }));

      const result = computePayroll({
        payBasis: comp.payBasis as PayBasis,
        basicRate: comp.basicRate.toString(),
        standardWorkDaysPerMonth: comp.standardWorkDaysPerMonth?.toString() || companyWorkDays,
        isManagerialExempt: emp.isManagerialExempt,
        timesheets,
        allowances,
        currentCompanyId: companyId,
        isSemiMonthly: periodType === PeriodType.FIRST_HALF || periodType === PeriodType.SECOND_HALF,
        cutoffType: periodType === PeriodType.FIRST_HALF ? "FIRST_HALF" : periodType === PeriodType.SECOND_HALF ? "SECOND_HALF" : "MONTHLY",
        basicPayFrequency: company?.basicPayFrequency ?? "TWICE_A_MONTH",
        allowancePayFrequency: company?.allowancePayFrequency ?? "TWICE_A_MONTH",
        isStatutoryDeductionCutoff,
        statutoryDeductionScale,
        isDeductSss: emp.isDeductSss,
        waiveMandatoryMpfWisp: company?.waiveMandatoryMpfWisp ?? false,
        sssDeductionMode: emp.sssDeductionMode,
        sssCustomAmountEe: emp.sssCustomAmountEe ? emp.sssCustomAmountEe.toString() : null,
        sssCustomAmountEr: emp.sssCustomAmountEr ? emp.sssCustomAmountEr.toString() : null,
        isDeductPhilhealth: emp.isDeductPhilhealth,
        philhealthDeductionMode: emp.philhealthDeductionMode,
        philhealthCustomAmountEe: emp.philhealthCustomAmountEe ? emp.philhealthCustomAmountEe.toString() : null,
        philhealthCustomAmountEr: emp.philhealthCustomAmountEr ? emp.philhealthCustomAmountEr.toString() : null,
        isDeductPagibig: emp.isDeductPagibig,
        pagibigDeductionMode: emp.pagibigDeductionMode,
        pagibigCustomAmountEe: emp.pagibigCustomAmountEe ? emp.pagibigCustomAmountEe.toString() : null,
        pagibigCustomAmountEr: emp.pagibigCustomAmountEr ? emp.pagibigCustomAmountEr.toString() : null,
        isDeductWithholdingTax: emp.isDeductWithholdingTax,
        monthlyEquivalentCompensation: monthlyEquivalentCompensation.toString(),
        rates: rateInputs,
        activeLoans,
        cutoffDate: cutoffEnd,
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
          rate: li.rate ? li.rate.toFixed(4) : null,
          sourceRef: li.loanId
            ? { loanId: li.loanId }
            : (li.sourceRef as Prisma.InputJsonObject | undefined),
        }));
      });
      if (lineItemsData.length > 0) {
        await tx.payrollLineItem.createMany({ data: lineItemsData });
      }
    }

    return run.id;
  });

  return runId;
}
