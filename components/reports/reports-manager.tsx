"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileTextIcon,
  DownloadIcon,
  CalendarIcon,
  ShieldCheckIcon,
  BanknoteIcon,
  Building2Icon,
  UserIcon,
} from "lucide-react";

interface RunOption {
  id: string;
  runNumber: number;
  cutoffStart: string;
  cutoffEnd: string;
}
interface EmployeeOption {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
}

function openReport(href: string) {
  window.open(href, "_blank");
}

export function ReportsManager({
  postedRuns,
  employees,
}: {
  postedRuns: RunOption[];
  employees: EmployeeOption[];
}) {
  const [runId, setRunId] = useState(postedRuns[0]?.id ?? "");
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [annualYear, setAnnualYear] = useState(String(now.getFullYear()));

  return (
    <div className="space-y-6">
      {/* 1. Per-Run Payroll & Statutory Remittances */}
      <Card className="border-slate-200/90 shadow-xs dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileTextIcon className="size-4 text-blue-600" /> Per-Run Reports &amp; Remittance Schedules
          </CardTitle>
          <CardDescription className="text-xs">
            Generate official payroll registers, SSS R-3, PhilHealth RF-1, Pag-IBIG MCRF, and bank disbursement files for any posted cutoff run.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-4 text-xs">
          <div className="space-y-1.5 max-w-md">
            <Label htmlFor="runId" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select Posted Payroll Run
            </Label>
            <Select value={runId} onValueChange={(v) => setRunId(v ?? "")}>
              <SelectTrigger id="runId" className="h-9 w-full text-xs">
                <SelectValue placeholder="Select a posted run" />
              </SelectTrigger>
              <SelectContent>
                {postedRuns.map((r) => (
                  <SelectItem key={r.id} value={r.id} className="text-xs">
                    Run #{r.runNumber} · {r.cutoffStart} – {r.cutoffEnd}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Available Export Documents
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-semibold"
                disabled={!runId}
                onClick={() => openReport(`/api/reports/payroll-register/${runId}`)}
              >
                <DownloadIcon className="size-3.5 text-blue-600" /> Payroll Register PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-semibold"
                disabled={!runId}
                onClick={() => openReport(`/api/reports/remittance/sss/${runId}`)}
              >
                <DownloadIcon className="size-3.5 text-blue-600" /> SSS R-3 Contribution Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-semibold"
                disabled={!runId}
                onClick={() => openReport(`/api/reports/remittance/philhealth/${runId}`)}
              >
                <DownloadIcon className="size-3.5 text-blue-600" /> PhilHealth RF-1 Remittance
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-semibold"
                disabled={!runId}
                onClick={() => openReport(`/api/reports/remittance/pagibig/${runId}`)}
              >
                <DownloadIcon className="size-3.5 text-blue-600" /> Pag-IBIG MCRF Member Schedule
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-semibold"
                disabled={!runId}
                onClick={() => openReport(`/api/reports/bank-disbursement/${runId}`)}
              >
                <DownloadIcon className="size-3.5 text-emerald-600" /> Bank Advice (PDF)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-semibold"
                disabled={!runId}
                onClick={() => openReport(`/api/reports/bank-disbursement/${runId}/csv`)}
              >
                <DownloadIcon className="size-3.5 text-emerald-600" /> Bank Payroll Advice (CSV)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Monthly BIR Form 1601-C Declaration */}
      <Card className="border-slate-200/90 shadow-xs dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarIcon className="size-4 text-blue-600" /> Monthly Statutory Declaration (BIR Form 1601-C)
          </CardTitle>
          <CardDescription className="text-xs">
            Official Bureau of Internal Revenue monthly remittance return of income taxes withheld on compensation.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-4 text-xs">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="year1601c" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tax Year
              </Label>
              <Input
                id="year1601c"
                className="w-32 h-9 text-xs font-mono"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="month1601c" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Month (1–12)
              </Label>
              <Input
                id="month1601c"
                className="w-24 h-9 text-xs font-mono"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-semibold h-9"
              onClick={() => openReport(`/api/reports/1601c/${year}/${month}`)}
            >
              <DownloadIcon className="size-3.5 text-blue-600" /> Generate BIR Form 1601-C PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Annual Statutory Reports & Alphalist */}
      <Card className="border-slate-200/90 shadow-xs dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheckIcon className="size-4 text-blue-600" /> Annual Tax Filings &amp; Statutory Reports
          </CardTitle>
          <CardDescription className="text-xs">
            Annual 13th month pay computations, BIR Form 1604-C Alphalist schedules, and individual employee BIR Form 2316 certificates.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-6 text-xs">
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Company-Wide Annual Reports
            </span>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="annualYearThirteenthMonth" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Calendar Year
                </Label>
                <Input
                  id="annualYearThirteenthMonth"
                  className="w-32 h-9 text-xs font-mono"
                  value={annualYear}
                  onChange={(e) => setAnnualYear(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-semibold h-9"
                onClick={() => openReport(`/api/reports/thirteenth-month/${annualYear}`)}
              >
                <DownloadIcon className="size-3.5 text-blue-600" /> 13th Month Pay Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-semibold h-9"
                onClick={() => openReport(`/api/reports/alphalist/${annualYear}`)}
              >
                <DownloadIcon className="size-3.5 text-blue-600" /> BIR Alphalist (1604-C Schedule)
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Individual Employee BIR Form 2316 Certificate
            </span>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="employeeId2316" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Employee
                </Label>
                <Select value={employeeId} onValueChange={(v) => setEmployeeId(v ?? "")}>
                  <SelectTrigger id="employeeId2316" className="w-72 h-9 text-xs">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id} className="text-xs">
                        {e.lastName}, {e.firstName} ({e.employeeNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="annualYear2316" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tax Year
                </Label>
                <Input
                  id="annualYear2316"
                  className="w-28 h-9 text-xs font-mono"
                  value={annualYear}
                  onChange={(e) => setAnnualYear(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-semibold h-9"
                disabled={!employeeId}
                onClick={() => openReport(`/api/reports/2316/${employeeId}/${annualYear}`)}
              >
                <DownloadIcon className="size-3.5 text-blue-600" /> Generate BIR Form 2316 PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
