"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LandmarkIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  CalendarIcon,
  Building2Icon,
  InfoIcon,
} from "lucide-react";

export function StatutoryGuidelines() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-950/20 p-4 flex items-start gap-3">
        <InfoIcon className="size-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
            Philippine Statutory Compliance &amp; Check Remittance Guidelines
          </h4>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            Statutory contributions deducted from employees are held in trust by the employer.
            Under Philippine law (RA 11199, RA 11223, RA 9679, and NIRC), timely remittance to SSS, PhilHealth, Pag-IBIG, and the BIR is mandatory.
            Use this guide to ensure correct check payee naming, PRN generation, and deadline adherence.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SSS Guidelines */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <LandmarkIcon className="size-4" /> Social Security System (SSS)
              </CardTitle>
              <Badge variant="outline" className="text-[10px] border-blue-300 dark:border-blue-500/40 text-blue-700 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-950/40">
                RA 11199
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Regular Contributions (SS + EC + WISP/MPF) &amp; Member Loans
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-xs text-slate-700 dark:text-slate-300">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">
                Official Check Payee:
              </span>
              <p className="font-mono text-sm text-slate-900 dark:text-white font-bold bg-slate-100 dark:bg-slate-950/80 p-2 rounded border border-slate-200 dark:border-slate-800 mt-1">
                Social Security System
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">
                Remittance Deadline:
              </span>
              <p className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                <CalendarIcon className="size-3.5 text-blue-600 dark:text-blue-400" />
                Last day of the month following the applicable payroll month.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-700 dark:text-amber-400">
                <AlertTriangleIcon className="size-3.5" /> SSS Loan Remittance Separation Rule
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300/90">
                SSS strictly requires separate Payment Reference Numbers (PRN) for Member Loans (Salary/Calamity) versus Regular Contributions. SSS bank collection accounts are separated; issuing separate checks per PRN is standard banking compliance.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* PhilHealth Guidelines */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-teal-600 dark:text-emerald-400 flex items-center gap-2">
                <LandmarkIcon className="size-4" /> Philippine Health Insurance (PhilHealth)
              </CardTitle>
              <Badge variant="outline" className="text-[10px] border-teal-300 dark:border-emerald-500/40 text-teal-700 dark:text-emerald-400 font-mono bg-teal-50 dark:bg-emerald-950/40">
                RA 11223 (UHC Act)
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              National Health Insurance Program (NHIP) Monthly Premiums
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-xs text-slate-700 dark:text-slate-300">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">
                Official Check Payee:
              </span>
              <p className="font-mono text-sm text-slate-900 dark:text-white font-bold bg-slate-100 dark:bg-slate-950/80 p-2 rounded border border-slate-200 dark:border-slate-800 mt-1">
                Philippine Health Insurance Corporation
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">
                Remittance Deadline:
              </span>
              <p className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                <CalendarIcon className="size-3.5 text-teal-600 dark:text-emerald-400" />
                10th to 15th calendar day of the month following the applicable month.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-emerald-950/30 border border-teal-200 dark:border-emerald-500/30 text-teal-900 dark:text-emerald-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[11px] text-teal-700 dark:text-emerald-400">
                <CheckCircle2Icon className="size-3.5" /> EPRS Statement of Premium Account (SPA)
              </div>
              <p className="text-[11px] leading-relaxed text-teal-800 dark:text-emerald-300/90">
                Payments must be accompanied by the Electronic Premium Reporting System (EPRS) SPA Number. The SPA number serves as the PRN for accredited banks.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pag-IBIG Guidelines */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <LandmarkIcon className="size-4" /> Pag-IBIG Fund (HDMF)
              </CardTitle>
              <Badge variant="outline" className="text-[10px] border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-400 font-mono bg-amber-50 dark:bg-amber-950/40">
                RA 9679
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Regular Member Savings &amp; Multi-Purpose (MPL) / Calamity Loans
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-xs text-slate-700 dark:text-slate-300">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">
                Official Check Payee:
              </span>
              <p className="font-mono text-sm text-slate-900 dark:text-white font-bold bg-slate-100 dark:bg-slate-950/80 p-2 rounded border border-slate-200 dark:border-slate-800 mt-1">
                Home Development Mutual Fund
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">
                Remittance Deadline:
              </span>
              <p className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                <CalendarIcon className="size-3.5 text-amber-600 dark:text-amber-400" />
                10th to 15th calendar day of the month following the applicable month.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-700 dark:text-amber-400">
                <InfoIcon className="size-3.5" /> Payment Instruction Slip (PIS)
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                Generate the Payment Instruction Slip via e-SRS or Virtual Pag-IBIG for Employers. Check payments require the PIS Reference Number.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* BIR Guidelines */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <LandmarkIcon className="size-4" /> Bureau of Internal Revenue (BIR)
              </CardTitle>
              <Badge variant="outline" className="text-[10px] border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-400 font-mono bg-rose-50 dark:bg-rose-950/40">
                Tax Code / Form 1601-C
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Monthly Remittance Return of Income Taxes Withheld on Compensation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-xs text-slate-700 dark:text-slate-300">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">
                Official Check Payee:
              </span>
              <p className="font-mono text-sm text-slate-900 dark:text-white font-bold bg-slate-100 dark:bg-slate-950/80 p-2 rounded border border-slate-200 dark:border-slate-800 mt-1">
                Bureau of Internal Revenue
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">
                Remittance Deadline:
              </span>
              <p className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                <CalendarIcon className="size-3.5 text-rose-600 dark:text-rose-400" />
                10th of following month (Manual / eBIRForms) or 15th (eFPS filers).
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[11px] text-rose-700 dark:text-rose-400">
                <AlertTriangleIcon className="size-3.5" /> Authorized Agent Bank (AAB) Filing
              </div>
              <p className="text-[11px] leading-relaxed text-rose-800 dark:text-rose-300/90">
                Ensure checks are presented with 3 copies of BIR Form 1601-C at the Authorized Agent Bank within the company&apos;s registered Revenue District Office (RDO).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
