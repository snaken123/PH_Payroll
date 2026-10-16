"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import {
  ShieldCheckIcon,
  CheckCircle2Icon,
  ClockIcon,
  BanknoteIcon,
  Loader2Icon,
  CreditCardIcon,
  ReceiptIcon,
  Building2Icon,
} from "lucide-react";
import {
  TagStatutoryPaymentDialog,
  type StatutoryAgencyPaymentData,
} from "./tag-statutory-payment-dialog";
import type { CompanyBankOption } from "@/components/payroll/record-check-dialog";

interface AgencyItem extends StatutoryAgencyPaymentData {
  agency: "SSS" | "PHILHEALTH" | "PAGIBIG" | "BIR";
}

interface RunGroup {
  payrollRunId: string;
  runNumber: number;
  cutoffStart: string;
  cutoffEnd: string;
  payDate: string;
  agencies: AgencyItem[];
  totalDue: number;
  totalPaid: number;
  totalPending: number;
}

interface SummaryData {
  company: {
    id: string;
    legalName: string;
    companyCode: string;
    tin: string;
  };
  groups: RunGroup[];
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

interface ContributionsTrackerProps {
  companyBankAccounts?: CompanyBankOption[];
  canManage?: boolean;
}

export function ContributionsTracker({
  companyBankAccounts = [],
  canManage = true,
}: ContributionsTrackerProps) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState<string>("ALL");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        selectedRunId && selectedRunId !== "ALL"
          ? `/api/reports/contributions?payrollRunId=${selectedRunId}`
          : `/api/reports/contributions`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedRunId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
        <Loader2Icon className="size-5 animate-spin text-blue-600" />
        Loading company statutory contributions...
      </div>
    );
  }

  const availableRuns = data?.availableRuns || [];
  const groups = data?.groups || [];
  const grandTotalDue = data?.grandTotalDue || 0;
  const grandTotalPaid = data?.grandTotalPaid || 0;
  const grandTotalPending = data?.grandTotalPending || 0;

  return (
    <div className="space-y-6">
      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          title="Total Contributions Due"
          value={`₱${grandTotalDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          subtitle="Computed directly from posted runs"
          icon={BanknoteIcon}
        />
        <MetricCard
          title="Remitted to Government"
          value={`₱${grandTotalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          subtitle="Tagged as PAID by company"
          icon={CheckCircle2Icon}
        />
        <MetricCard
          title="Pending Remittances"
          value={`₱${grandTotalPending.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          subtitle="Awaiting payment tagging"
          icon={ClockIcon}
        />
      </div>

      {/* Filter Toolbar Card */}
      <Card className="border-slate-200/90 shadow-xs dark:border-slate-800">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Filter by Payroll Run:
            </span>
            <div className="w-64">
              <Select value={selectedRunId} onValueChange={(v) => setSelectedRunId(v || "ALL")}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Posted Runs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">
                    All Posted Runs (Consolidated)
                  </SelectItem>
                  {availableRuns.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      Run #{r.runNumber} ({r.cutoffStart} – {r.cutoffEnd})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Building2Icon className="size-3.5 text-slate-400" />
            <span>
              Company: <strong className="text-slate-800 dark:text-slate-200">{data?.company.legalName}</strong> (
              {data?.company.companyCode})
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Main Groups & Tables */}
      {groups.length === 0 ? (
        <Card className="border-slate-200/90 shadow-xs dark:border-slate-800">
          <CardContent className="py-12 text-center space-y-2">
            <ShieldCheckIcon className="size-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No posted payroll runs found
            </p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Statutory contribution amounts are automatically calculated as soon as a payroll run is posted.
            </p>
          </CardContent>
        </Card>
      ) : (
        groups.map((grp) => {
          const periodEnd = new Date(grp.cutoffEnd);
          const periodYear = periodEnd.getUTCFullYear();
          const periodMonth = periodEnd.getUTCMonth() + 1;

          return (
            <Card key={grp.payrollRunId} className="border-slate-200/90 shadow-xs dark:border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <ShieldCheckIcon className="size-4 text-blue-600" />
                    Payroll Run #{grp.runNumber} — Statutory Contributions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Cutoff: {grp.cutoffStart} to {grp.cutoffEnd} · Pay Date: {grp.payDate}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[11px] px-2 py-0.5 font-bold bg-slate-100 dark:bg-slate-800"
                  >
                    Run Total: ₱{grp.totalDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800">
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Government Agency
                      </TableHead>
                      <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Employee Share (EE)
                      </TableHead>
                      <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Employer Share (ER)
                      </TableHead>
                      <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Total Amount Due
                      </TableHead>
                      <TableHead className="text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Payment Status
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Payment &amp; Check Details
                      </TableHead>
                      <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grp.agencies.map((ag) => {
                      const isPaid = ag.status === "PAID";
                      return (
                        <TableRow key={ag.agency} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={`size-7 rounded-lg flex items-center justify-center font-bold text-[10px] ${
                                  ag.agency === "SSS"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                    : ag.agency === "PHILHEALTH"
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                      : ag.agency === "PAGIBIG"
                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                        : "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                                }`}
                              >
                                {ag.agency}
                              </div>
                              <div>
                                <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                                  {ag.label}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400">
                            ₱{ag.eeAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400">
                            ₱{ag.erAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-slate-900 dark:text-slate-100">
                            ₱{ag.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-2 py-0.5 font-bold ${
                                isPaid
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300"
                              }`}
                            >
                              {ag.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {isPaid ? (
                              <div className="space-y-0.5 text-[11px]">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {ag.checkNumber && (
                                    <span className="font-mono font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                                      Check #{ag.checkNumber}
                                    </span>
                                  )}
                                  {ag.paymentMethod && (
                                    <span className="text-slate-500 font-medium">({ag.paymentMethod})</span>
                                  )}
                                  {ag.paymentDate && (
                                    <span className="text-slate-600 dark:text-slate-400">
                                      on {new Date(ag.paymentDate).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                {ag.referenceNumber && (
                                  <p className="text-slate-500 font-mono">
                                    Ref/OR: <strong className="text-slate-700 dark:text-slate-300">{ag.referenceNumber}</strong>
                                  </p>
                                )}
                                {ag.bankName && (
                                  <p className="text-slate-400 truncate max-w-[200px]">Bank: {ag.bankName}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Pending Remittance</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right py-2">
                            {canManage && (
                              <TagStatutoryPaymentDialog
                                agencyData={ag}
                                payrollRunId={grp.payrollRunId}
                                runNumber={grp.runNumber}
                                periodYear={periodYear}
                                periodMonth={periodMonth}
                                companyBankAccounts={companyBankAccounts}
                                onSuccess={fetchData}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-slate-50/90 dark:bg-slate-900/90 font-bold border-t-2 border-slate-200/90 dark:border-slate-800">
                      <TableCell className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        Total Run Contributions
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-slate-700 dark:text-slate-300">
                        ₱{grp.agencies.reduce((s, a) => s + a.eeAmount, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-slate-700 dark:text-slate-300">
                        ₱{grp.agencies.reduce((s, a) => s + a.erAmount, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-blue-700 dark:text-blue-400">
                        ₱{grp.totalDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell colSpan={3} className="text-right text-xs font-medium text-slate-500">
                        Remitted: <strong className="text-emerald-600">₱{grp.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong> · Pending: <strong className="text-amber-600">₱{grp.totalPending.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
