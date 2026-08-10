import { prisma } from "@/lib/db";
import type { PayslipDocumentData } from "./documents/PayslipDocument";
import type { PayrollRegisterDocumentData, PayrollRegisterRow } from "./documents/PayrollRegisterDocument";
import type { AgencyRemittanceDocumentData, RemittanceRow } from "./documents/AgencyRemittanceDocument";
import type { Form1601CDocumentData, Form1601CCutoffRow } from "./documents/Form1601CDocument";
import type { ThirteenthMonthDocumentData, ThirteenthMonthRow } from "./documents/ThirteenthMonthDocument";
import { computeThirteenthMonthPay } from "@/lib/payroll/thirteenthMonth";
import { computeAnnualization } from "@/lib/payroll/annualization";
import type { Form2316DocumentData } from "./documents/Form2316Document";
import type { BirBracketRow } from "@/lib/payroll/types";
import type { Form2307DocumentData } from "./documents/Form2307Document";
import type { FinalPayStatementDocumentData } from "./documents/FinalPayStatementDocument";
import type { CertificateOfEmploymentDocumentData } from "./documents/CertificateOfEmploymentDocument";

export type RemittanceAgency = "SSS" | "PHILHEALTH" | "PAGIBIG";

const AGENCY_CONFIG: Record<
  RemittanceAgency,
  {
    reportTitle: string;
    agencyLabel: string;
    idColumnLabel: string;
    employerNumberLabel: string;
    eeCategory: string;
    erCategory: string;
    hasEc: boolean;
  }
> = {
  SSS: {
    reportTitle: "SSS Contribution Collection List (R-3)",
    agencyLabel: "Social Security System",
    idColumnLabel: "SS Number",
    employerNumberLabel: "SSS Employer Number",
    eeCategory: "SSS_EE",
    erCategory: "SSS_ER",
    // The official R-3 form has a separate EC column, but the engine's
    // SSS_ER line item bundles ER share + MPF + EC into one total (correct
    // for net pay, since EC never affects the employee) — no separately
    // tracked EC amount exists to report here. ER Share total is accurate,
    // just not broken into agency sub-components on this report.
    hasEc: false,
  },
  PHILHEALTH: {
    reportTitle: "PhilHealth Employer Remittance Report (RF-1)",
    agencyLabel: "Philippine Health Insurance Corporation",
    idColumnLabel: "PhilHealth Number",
    employerNumberLabel: "PhilHealth Employer Number (PEN)",
    eeCategory: "PHILHEALTH_EE",
    erCategory: "PHILHEALTH_ER",
    hasEc: false,
  },
  PAGIBIG: {
    reportTitle: "Pag-IBIG Membership Contribution Remittance Form (MCRF)",
    agencyLabel: "Home Development Mutual Fund",
    idColumnLabel: "Pag-IBIG Number",
    employerNumberLabel: "Pag-IBIG Employer ID",
    eeCategory: "PAGIBIG_EE",
    erCategory: "PAGIBIG_ER",
    hasEc: false,
  },
};

/** Every report reads exclusively from POSTED payroll data — never draft —
 * both as a correctness safeguard and a consequence of the immutability
 * design (a form's numbers can't shift under an already-issued document). */
export class ReportNotAvailableError extends Error {}

export async function getPayslipReportData(
  companyId: string,
  payslipId: string
): Promise<PayslipDocumentData> {
  const [payslip, company] = await Promise.all([
    prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        employee: { select: { employeeNumber: true, firstName: true, lastName: true, positionTitle: true } },
        payrollRun: { include: { payrollPeriod: true } },
        lineItems: true,
      },
    }),
    prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
  ]);

  if (!payslip || payslip.companyId !== companyId) {
    throw new ReportNotAvailableError("Payslip not found");
  }
  if (payslip.payrollRun.status !== "POSTED") {
    throw new ReportNotAvailableError("Payslip is only available once its payroll run is posted");
  }

  return {
    company: {
      legalName: company.legalName,
      tin: company.tin,
      registeredAddress: company.registeredAddress,
    },
    employee: {
      employeeNumber: payslip.employee.employeeNumber,
      fullName: `${payslip.employee.lastName}, ${payslip.employee.firstName}`,
      positionTitle: payslip.employee.positionTitle,
    },
    period: {
      cutoffStart: payslip.payrollRun.payrollPeriod.cutoffStart,
      cutoffEnd: payslip.payrollRun.payrollPeriod.cutoffEnd,
      payDate: payslip.payrollRun.payrollPeriod.payDate,
    },
    lineItems: payslip.lineItems.map((li) => ({
      category: li.category,
      direction: li.direction,
      description: li.description,
      amount: li.amount.toString(),
    })),
    grossPay: payslip.grossPay.toString(),
    totalStatutoryDeductions: payslip.totalStatutoryDeductions.toString(),
    totalOtherDeductions: payslip.totalOtherDeductions.toString(),
    netPay: payslip.netPay.toString(),
  };
}

export async function getPayrollRegisterData(
  companyId: string,
  runId: string
): Promise<PayrollRegisterDocumentData> {
  const [run, company] = await Promise.all([
    prisma.payrollRun.findUnique({
      where: { id: runId },
      include: {
        payrollPeriod: true,
        payslips: {
          include: { employee: { select: { employeeNumber: true, firstName: true, lastName: true } } },
          orderBy: { employee: { lastName: "asc" } },
        },
      },
    }),
    prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
  ]);

  if (!run || run.companyId !== companyId) {
    throw new ReportNotAvailableError("Payroll run not found");
  }
  if (run.status !== "POSTED") {
    throw new ReportNotAvailableError("Payroll register is only available once the run is posted");
  }

  const rows: PayrollRegisterRow[] = run.payslips.map((p) => ({
    employeeNumber: p.employee.employeeNumber,
    fullName: `${p.employee.lastName}, ${p.employee.firstName}`,
    grossPay: p.grossPay.toString(),
    totalStatutoryDeductions: p.totalStatutoryDeductions.toString(),
    totalOtherDeductions: p.totalOtherDeductions.toString(),
    netPay: p.netPay.toString(),
  }));

  return {
    company: { legalName: company.legalName, tin: company.tin },
    period: {
      cutoffStart: run.payrollPeriod.cutoffStart,
      cutoffEnd: run.payrollPeriod.cutoffEnd,
      payDate: run.payrollPeriod.payDate,
    },
    runNumber: run.runNumber,
    rows,
  };
}

export async function getForm1601CData(
  companyId: string,
  year: number,
  month: number
): Promise<Form1601CDocumentData> {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0));

  const [periods, company] = await Promise.all([
    prisma.payrollPeriod.findMany({
      where: { companyId, cutoffStart: { gte: monthStart, lte: monthEnd } },
      include: {
        runs: {
          where: { status: "POSTED" },
          include: { payslips: { include: { lineItems: true } } },
          orderBy: { runNumber: "desc" },
          take: 1,
        },
      },
      orderBy: { cutoffStart: "asc" },
    }),
    prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
  ]);

  const cutoffs: Form1601CCutoffRow[] = [];
  let totalTaxWithheld = 0;

  for (const period of periods) {
    const run = period.runs[0];
    if (!run) continue; // no posted run yet for this cutoff — excluded, not zero-filled

    const totalCompensation = run.payslips.reduce((sum, p) => sum + p.grossPay.toNumber(), 0);
    const taxWithheld = run.payslips.reduce(
      (sum, p) =>
        sum + p.lineItems.filter((li) => li.category === "WITHHOLDING_TAX").reduce((s, li) => s + li.amount.toNumber(), 0),
      0
    );

    cutoffs.push({
      periodType: period.periodType,
      cutoffStart: period.cutoffStart,
      cutoffEnd: period.cutoffEnd,
      employeeCount: run.payslips.length,
      totalCompensation: totalCompensation.toString(),
      totalTaxWithheld: taxWithheld.toString(),
    });
    totalTaxWithheld += taxWithheld;
  }

  return {
    company: { legalName: company.legalName, tin: company.tin, rdoCode: company.rdoCode },
    month,
    year,
    cutoffs,
    totalTaxWithheld: totalTaxWithheld.toString(),
  };
}

export async function getThirteenthMonthReportData(
  companyId: string,
  year: number
): Promise<ThirteenthMonthDocumentData> {
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

  const [config, employees, company] = await Promise.all([
    prisma.thirteenthMonthConfig.findFirst({
      where: { effectiveFrom: { lte: yearEnd }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: yearEnd } }] },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.employee.findMany({
      where: { companyId },
      include: {
        payslips: {
          where: {
            payrollRun: {
              status: "POSTED",
              payrollPeriod: { cutoffStart: { gte: yearStart, lte: yearEnd } },
            },
          },
          include: { lineItems: { where: { category: "BASIC_PAY" } } },
        },
      },
      orderBy: { lastName: "asc" },
    }),
    prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
  ]);
  const exemptionCeiling = config?.exemptionCeiling.toString() ?? "90000";

  const rows: ThirteenthMonthRow[] = employees
    .map((emp) => {
      const basicSalaryEarned = emp.payslips.reduce(
        (sum, p) => sum + p.lineItems.reduce((s, li) => s + li.amount.toNumber(), 0),
        0
      );
      if (basicSalaryEarned === 0) return null;

      const result = computeThirteenthMonthPay(basicSalaryEarned, exemptionCeiling);

      return {
        employeeNumber: emp.employeeNumber,
        name: `${emp.lastName}, ${emp.firstName}`,
        basicSalaryEarned: basicSalaryEarned.toString(),
        thirteenthMonthPay: result.thirteenthMonthPay.toString(),
        taxableExcess: result.taxableExcess.toString(),
      };
    })
    .filter((r): r is ThirteenthMonthRow => r !== null);

  return {
    company: { legalName: company.legalName, tin: company.tin },
    year,
    exemptionCeiling,
    rows,
  };
}

export async function getForm2316Data(
  companyId: string,
  employeeId: string,
  year: number
): Promise<Form2316DocumentData> {
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

  const [employee, company, annualBrackets, thirteenthMonthConfig] = await Promise.all([
    prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      include: {
        payslips: {
          where: {
            payrollRun: {
              status: "POSTED",
              payrollPeriod: { cutoffStart: { gte: yearStart, lte: yearEnd } },
            },
          },
          include: { lineItems: true },
        },
      },
    }),
    prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
    prisma.birWithholdingBracket.findMany({
      where: {
        payPeriodType: "ANNUAL",
        effectiveFrom: { lte: yearEnd },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: yearEnd } }],
      },
    }),
    prisma.thirteenthMonthConfig.findFirst({
      where: {
        effectiveFrom: { lte: yearEnd },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: yearEnd } }],
      },
      orderBy: { effectiveFrom: "desc" },
    }),
  ]);
  if (!employee) throw new ReportNotAvailableError("Employee not found");

  if (annualBrackets.length === 0) {
    throw new ReportNotAvailableError("No ANNUAL BIR withholding brackets configured for this year");
  }

  const exemptionCeiling = thirteenthMonthConfig?.exemptionCeiling.toNumber() ?? 90000;

  let totalGrossCompensation = 0;
  let totalStatutoryContributions = 0;
  let cumulativeTaxWithheld = 0;
  let totalNonTaxableAllowances = 0;
  let totalThirteenthMonthAndBenefits = 0;

  for (const p of employee.payslips) {
    totalGrossCompensation += p.grossPay.toNumber();
    for (const li of p.lineItems) {
      if (li.category === "SSS_EE" || li.category === "PHILHEALTH_EE" || li.category === "PAGIBIG_EE") {
        totalStatutoryContributions += li.amount.toNumber();
      }
      if (li.category === "WITHHOLDING_TAX") {
        cumulativeTaxWithheld += li.amount.toNumber();
      }
      if (li.category === "ALLOWANCE") {
        const ref = li.sourceRef as { nonTaxableAmount?: string; isTaxable?: boolean } | null;
        if (ref?.nonTaxableAmount !== undefined) {
          totalNonTaxableAllowances += Number(ref.nonTaxableAmount);
        } else if (ref?.isTaxable === false) {
          totalNonTaxableAllowances += li.amount.toNumber();
        }
      }
      if (li.category === "THIRTEENTH_MONTH_ACCRUAL") {
        totalThirteenthMonthAndBenefits += li.amount.toNumber();
      }
    }
  }

  const exemptThirteenthMonthAndBenefits = Math.min(totalThirteenthMonthAndBenefits, exemptionCeiling);
  const totalExemptions = totalStatutoryContributions + totalNonTaxableAllowances + exemptThirteenthMonthAndBenefits;
  const totalTaxableCompensation = Math.max(0, totalGrossCompensation - totalExemptions);

  const annualization = computeAnnualization(
    totalTaxableCompensation,
    cumulativeTaxWithheld,
    annualBrackets.map((b) => ({
      payPeriodType: "ANNUAL" as const,
      bracketFloor: b.bracketFloor.toString(),
      bracketCeiling: b.bracketCeiling?.toString() ?? null,
      baseTax: b.baseTax.toString(),
      excessRate: b.excessRate.toString(),
    })) satisfies BirBracketRow[]
  );

  return {
    company: {
      legalName: company.legalName,
      tin: company.tin,
      rdoCode: company.rdoCode,
      registeredAddress: company.registeredAddress,
    },
    employee: {
      employeeNumber: employee.employeeNumber,
      fullName: `${employee.lastName}, ${employee.firstName}`,
      tin: employee.tin ?? "",
    },
    year,
    totalGrossCompensation: totalGrossCompensation.toString(),
    totalStatutoryContributions: totalStatutoryContributions.toString(),
    totalTaxableCompensation: totalTaxableCompensation.toString(),
    cumulativeTaxWithheld: cumulativeTaxWithheld.toString(),
    annualTaxDue: annualization.annualTaxDue.toString(),
    yearEndAdjustment: annualization.yearEndAdjustment.toString(),
  };
}

export async function getForm2307Data(
  companyId: string,
  paymentId: string
): Promise<Form2307DocumentData> {
  const [payment, company] = await Promise.all([
    prisma.contractorPayment.findUnique({
      where: { id: paymentId },
      include: { contractor: true },
    }),
    prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
  ]);
  if (!payment || payment.companyId !== companyId) {
    throw new ReportNotAvailableError("Contractor payment not found");
  }
  if (payment.status !== "POSTED") {
    throw new ReportNotAvailableError("Form 2307 is only available once the payment is posted");
  }

  return {
    company: {
      legalName: company.legalName,
      tin: company.tin,
      registeredAddress: company.registeredAddress,
    },
    contractor: {
      name: payment.contractor.name,
      tin: payment.contractor.tin,
      address: payment.contractor.address,
      atcCode: payment.contractor.atcCode,
    },
    payment: {
      paymentNumber: payment.paymentNumber,
      paymentDate: payment.paymentDate,
      grossAmount: payment.grossAmount.toString(),
      ewtRate: payment.ewtRate.toString(),
      ewtAmount: payment.ewtAmount.toString(),
      netAmount: payment.netAmount.toString(),
      invoiceReference: payment.invoiceReference,
    },
  };
}

export async function getFinalPayStatementData(
  companyId: string,
  finalPayRunId: string
): Promise<FinalPayStatementDocumentData> {
  const [run, company] = await Promise.all([
    prisma.finalPayRun.findUnique({
      where: { id: finalPayRunId },
      include: {
        employee: { select: { employeeNumber: true, firstName: true, lastName: true, positionTitle: true } },
        lineItems: true,
      },
    }),
    prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
  ]);

  if (!run || run.companyId !== companyId) {
    throw new ReportNotAvailableError("Final pay run not found");
  }
  if (run.status !== "POSTED") {
    throw new ReportNotAvailableError("Final pay statement is only available once the run is posted");
  }

  return {
    company: {
      legalName: company.legalName,
      tin: company.tin,
      registeredAddress: company.registeredAddress,
    },
    employee: {
      employeeNumber: run.employee.employeeNumber,
      fullName: `${run.employee.lastName}, ${run.employee.firstName}`,
      positionTitle: run.employee.positionTitle,
    },
    finalPayNumber: run.finalPayNumber,
    separationDate: run.separationDate,
    separationCategory: run.separationCategory,
    lineItems: run.lineItems.map((li) => ({
      category: li.category,
      description: li.description,
      direction: li.direction,
      amount: li.amount.toString(),
      isTaxExempt: li.isTaxExempt,
    })),
    grossFinalPay: run.grossFinalPay.toString(),
    totalDeductions: run.totalDeductions.toString(),
    netFinalPay: run.netFinalPay.toString(),
  };
}

export async function getCertificateOfEmploymentData(
  companyId: string,
  employeeId: string
): Promise<CertificateOfEmploymentDocumentData> {
  const [employee, company] = await Promise.all([
    prisma.employee.findFirst({ where: { id: employeeId, companyId } }),
    prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
  ]);
  if (!employee) throw new ReportNotAvailableError("Employee not found");

  return {
    company: { legalName: company.legalName, registeredAddress: company.registeredAddress },
    employee: {
      fullName: `${employee.firstName} ${employee.lastName}`,
      positionTitle: employee.positionTitle,
      dateHired: employee.dateHired,
      dateSeparated: employee.dateSeparated,
    },
    issuedDate: new Date(),
  };
}

export async function getAgencyRemittanceData(
  companyId: string,
  runId: string,
  agency: RemittanceAgency
): Promise<AgencyRemittanceDocumentData> {
  const config = AGENCY_CONFIG[agency];

  const [run, company] = await Promise.all([
    prisma.payrollRun.findUnique({
      where: { id: runId },
      include: {
        payrollPeriod: true,
        payslips: {
          include: {
            employee: {
              select: {
                firstName: true,
                lastName: true,
                sssNumber: true,
                philhealthNumber: true,
                pagibigNumber: true,
              },
            },
            lineItems: true,
          },
          orderBy: { employee: { lastName: "asc" } },
        },
      },
    }),
    prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
  ]);

  if (!run || run.companyId !== companyId) {
    throw new ReportNotAvailableError("Payroll run not found");
  }
  if (run.status !== "POSTED") {
    throw new ReportNotAvailableError("This report is only available once the run is posted");
  }

  const idField =
    agency === "SSS" ? "sssNumber" : agency === "PHILHEALTH" ? "philhealthNumber" : "pagibigNumber";
  const employerNumber =
    agency === "SSS"
      ? company.sssEmployerNumber
      : agency === "PHILHEALTH"
        ? company.philhealthEmployerNumber
        : company.pagibigEmployerId;

  const rows: RemittanceRow[] = run.payslips
    .map((p) => {
      const eeLine = p.lineItems.find((li) => li.category === config.eeCategory);
      const erLine = p.lineItems.find((li) => li.category === config.erCategory);
      if (!eeLine && !erLine) return null;

      const ee = eeLine?.amount.toNumber() ?? 0;
      const er = erLine?.amount.toNumber() ?? 0;

      return {
        idNumber: p.employee[idField] ?? "",
        name: `${p.employee.lastName}, ${p.employee.firstName}`,
        eeShare: ee.toString(),
        erShare: er.toString(),
        total: (ee + er).toString(),
      };
    })
    .filter((r): r is RemittanceRow => r !== null);

  return {
    company: {
      legalName: company.legalName,
      tin: company.tin,
      employerNumber: employerNumber ?? "",
      employerNumberLabel: config.employerNumberLabel,
    },
    reportTitle: config.reportTitle,
    agencyLabel: config.agencyLabel,
    idColumnLabel: config.idColumnLabel,
    hasEcColumn: config.hasEc,
    period: { cutoffStart: run.payrollPeriod.cutoffStart, cutoffEnd: run.payrollPeriod.cutoffEnd },
    rows,
  };
}

export interface BirAlphalistRow {
  seqNo: number;
  employeeNumber: string;
  fullName: string;
  tin: string;
  status: string;
  totalGrossCompensation: string;
  nonTaxableStatutory: string;
  nonTaxableExemptions: string;
  totalNonTaxable: string;
  netTaxableCompensation: string;
  cumulativeTaxWithheld: string;
  annualTaxDue: string;
  yearEndAdjustment: string;
}

export interface BirAlphalistDocumentData {
  company: {
    legalName: string;
    tin: string;
    rdoCode: string;
    registeredAddress: string;
  };
  year: number;
  rows: BirAlphalistRow[];
  totals: {
    totalGrossCompensation: string;
    totalNonTaxable: string;
    totalNetTaxableCompensation: string;
    totalCumulativeTaxWithheld: string;
    totalAnnualTaxDue: string;
    totalYearEndAdjustment: string;
  };
}

export async function getBirAlphalistData(
  companyId: string,
  year: number
): Promise<BirAlphalistDocumentData> {
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

  const [company, annualBrackets, thirteenthMonthConfig, employees] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
    prisma.birWithholdingBracket.findMany({
      where: {
        payPeriodType: "ANNUAL",
        effectiveFrom: { lte: yearEnd },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: yearEnd } }],
      },
    }),
    prisma.thirteenthMonthConfig.findFirst({
      where: {
        effectiveFrom: { lte: yearEnd },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: yearEnd } }],
      },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.employee.findMany({
      where: { companyId, isIncludedInAlphalist: true },
      include: {
        payslips: {
          where: {
            payrollRun: {
              status: "POSTED",
              payrollPeriod: { cutoffStart: { gte: yearStart, lte: yearEnd } },
            },
          },
          include: { lineItems: true },
        },
      },
      orderBy: { lastName: "asc" },
    }),
  ]);

  if (annualBrackets.length === 0) {
    throw new ReportNotAvailableError("No ANNUAL BIR withholding brackets configured for this year");
  }

  const exemptionCeiling = thirteenthMonthConfig?.exemptionCeiling.toNumber() ?? 90000;
  const birBracketInputs = annualBrackets.map((b) => ({
    payPeriodType: "ANNUAL" as const,
    bracketFloor: b.bracketFloor.toString(),
    bracketCeiling: b.bracketCeiling?.toString() ?? null,
    baseTax: b.baseTax.toString(),
    excessRate: b.excessRate.toString(),
  }));

  const rows: BirAlphalistRow[] = [];
  let sumGross = 0;
  let sumNonTaxable = 0;
  let sumTaxable = 0;
  let sumWithheld = 0;
  let sumTaxDue = 0;
  let sumAdjustment = 0;

  let seqNo = 1;
  for (const emp of employees) {
    if (emp.payslips.length === 0) continue;

    let totalGross = 0;
    let totalStatutory = 0;
    let cumulativeTaxWithheld = 0;
    let totalNonTaxableAllowances = 0;
    let totalThirteenthMonthAndBenefits = 0;

    for (const p of emp.payslips) {
      totalGross += p.grossPay.toNumber();
      for (const li of p.lineItems) {
        if (li.category === "SSS_EE" || li.category === "PHILHEALTH_EE" || li.category === "PAGIBIG_EE") {
          totalStatutory += li.amount.toNumber();
        }
        if (li.category === "WITHHOLDING_TAX") {
          cumulativeTaxWithheld += li.amount.toNumber();
        }
        if (li.category === "ALLOWANCE") {
          const ref = li.sourceRef as { nonTaxableAmount?: string; isTaxable?: boolean } | null;
          if (ref?.nonTaxableAmount !== undefined) {
            totalNonTaxableAllowances += Number(ref.nonTaxableAmount);
          } else if (ref?.isTaxable === false) {
            totalNonTaxableAllowances += li.amount.toNumber();
          }
        }
        if (li.category === "THIRTEENTH_MONTH_ACCRUAL") {
          totalThirteenthMonthAndBenefits += li.amount.toNumber();
        }
      }
    }

    const exemptThirteenthMonthAndBenefits = Math.min(totalThirteenthMonthAndBenefits, exemptionCeiling);
    const nonTaxableExemptions = totalNonTaxableAllowances + exemptThirteenthMonthAndBenefits;
    const totalNonTaxable = totalStatutory + nonTaxableExemptions;
    const netTaxable = Math.max(0, totalGross - totalNonTaxable);

    const annualization = computeAnnualization(netTaxable, cumulativeTaxWithheld, birBracketInputs);
    const annualTaxDue = annualization.annualTaxDue.toNumber();
    const yearEndAdjustment = annualization.yearEndAdjustment.toNumber();

    sumGross += totalGross;
    sumNonTaxable += totalNonTaxable;
    sumTaxable += netTaxable;
    sumWithheld += cumulativeTaxWithheld;
    sumTaxDue += annualTaxDue;
    sumAdjustment += yearEndAdjustment;

    rows.push({
      seqNo: seqNo++,
      employeeNumber: emp.employeeNumber,
      fullName: `${emp.lastName}, ${emp.firstName}`,
      tin: emp.tin || "N/A",
      status: emp.employmentStatus,
      totalGrossCompensation: totalGross.toFixed(2),
      nonTaxableStatutory: totalStatutory.toFixed(2),
      nonTaxableExemptions: nonTaxableExemptions.toFixed(2),
      totalNonTaxable: totalNonTaxable.toFixed(2),
      netTaxableCompensation: netTaxable.toFixed(2),
      cumulativeTaxWithheld: cumulativeTaxWithheld.toFixed(2),
      annualTaxDue: annualTaxDue.toFixed(2),
      yearEndAdjustment: yearEndAdjustment.toFixed(2),
    });
  }

  return {
    company: {
      legalName: company.legalName,
      tin: company.tin,
      rdoCode: company.rdoCode,
      registeredAddress: company.registeredAddress,
    },
    year,
    rows,
    totals: {
      totalGrossCompensation: sumGross.toFixed(2),
      totalNonTaxable: sumNonTaxable.toFixed(2),
      totalNetTaxableCompensation: sumTaxable.toFixed(2),
      totalCumulativeTaxWithheld: sumWithheld.toFixed(2),
      totalAnnualTaxDue: sumTaxDue.toFixed(2),
      totalYearEndAdjustment: sumAdjustment.toFixed(2),
    },
  };
}

export interface BankDisbursementRow {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  bankName: string;
  accountNumber: string;
  disbursingBankName: string;
  netPay: string;
}

export interface BankSummaryRow {
  bankAccountId: string;
  bankName: string;
  accountNumber: string;
  employeeCount: number;
  totalAmount: string;
}

export interface BankDisbursementDocumentData {
  company: {
    legalName: string;
    tin: string;
    registeredAddress: string;
  };
  runNumber: number;
  period: {
    cutoffStart: Date;
    cutoffEnd: Date;
    payDate: Date;
  };
  totalEmployees: number;
  totalPayrollAmount: string;
  bankSummaries: BankSummaryRow[];
  rows: BankDisbursementRow[];
}

export async function getBankDisbursementData(
  companyId: string,
  runId: string
): Promise<BankDisbursementDocumentData> {
  const [run, companyBanks] = await Promise.all([
    prisma.payrollRun.findFirst({
      where: { id: runId, companyId },
      include: {
        company: true,
        payrollPeriod: true,
        payslips: {
          include: {
            employee: true,
            disbursementBank: true,
          },
          orderBy: { employee: { lastName: "asc" } },
        },
      },
    }),
    prisma.companyBankAccount.findMany({
      where: { companyId },
    }),
  ]);

  if (!run) throw new ReportNotAvailableError("Payroll run not found");

  const defaultBank = companyBanks.find((b) => b.isDefault) ?? companyBanks[0];
  const bankSummaryMap = new Map<string, { bankName: string; accountNumber: string; count: number; total: number }>();

  let totalPayroll = 0;
  const rows: BankDisbursementRow[] = [];

  for (const p of run.payslips) {
    const net = p.netPay.toNumber();
    totalPayroll += net;

    const disbursingBank = p.disbursementBank ?? defaultBank;
    const disbursingBankId = disbursingBank?.id ?? "UNASSIGNED";
    const disbursingBankName = disbursingBank ? `${disbursingBank.bankName} (${disbursingBank.accountNumber})` : "Unassigned Bank Account";
    const disbursingAccNo = disbursingBank?.accountNumber ?? "—";

    const currentSummary = bankSummaryMap.get(disbursingBankId) ?? {
      bankName: disbursingBank?.bankName ?? "Default Company Account",
      accountNumber: disbursingAccNo,
      count: 0,
      total: 0,
    };
    currentSummary.count += 1;
    currentSummary.total += net;
    bankSummaryMap.set(disbursingBankId, currentSummary);

    rows.push({
      employeeId: p.employee.id,
      employeeNumber: p.employee.employeeNumber,
      employeeName: `${p.employee.lastName}, ${p.employee.firstName}`,
      bankName: p.employee.bankName || "Cash / ATM",
      accountNumber: p.employee.bankAccountNumber || "—",
      disbursingBankName,
      netPay: net.toFixed(2),
    });
  }

  const bankSummaries: BankSummaryRow[] = Array.from(bankSummaryMap.entries()).map(([id, val]) => ({
    bankAccountId: id,
    bankName: val.bankName,
    accountNumber: val.accountNumber,
    employeeCount: val.count,
    totalAmount: val.total.toFixed(2),
  }));

  return {
    company: {
      legalName: run.company.legalName,
      tin: run.company.tin,
      registeredAddress: run.company.registeredAddress,
    },
    runNumber: run.runNumber,
    period: {
      cutoffStart: run.payrollPeriod.cutoffStart,
      cutoffEnd: run.payrollPeriod.cutoffEnd,
      payDate: run.payrollPeriod.payDate,
    },
    totalEmployees: run.payslips.length,
    totalPayrollAmount: totalPayroll.toFixed(2),
    bankSummaries,
    rows,
  };
}
