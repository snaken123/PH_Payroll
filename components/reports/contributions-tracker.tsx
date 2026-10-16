"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ShieldCheckIcon,
  CheckCircle2Icon,
  ClockIcon,
  BanknoteIcon,
  Loader2Icon,
  CreditCardIcon,
  Building2Icon,
  ArrowRightIcon,
  LayersIcon,
  LayoutGridIcon,
  TablePropertiesIcon,
} from "lucide-react";
import {
  TagStatutoryPaymentDialog,
  type StatutoryAgencyPaymentData,
} from "./tag-statutory-payment-dialog";
import type { CompanyBankOption } from "@/components/payroll/record-check-dialog";
import { cn } from "@/lib/utils";

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

interface AgencyDesign {
  name: string;
  form: string;
  tag: string;
  badgeClass: string;
}

const AGENCY_CONFIG: Record<string, AgencyDesign> = {
  SSS: {
    name: "Social Security System",
    form: "Form R-3 (Monthly Remittance)",
    tag: "SSS",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
  },
  PHILHEALTH: {
    name: "PhilHealth",
    form: "Form RF-1 / Electronic EPRS",
    tag: "PHIC",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  },
  PAGIBIG: {
    name: "Pag-IBIG Fund",
    form: "Member Remittance (MCRF)",
    tag: "HDMF",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  },
  BIR: {
    name: "BIR Withholding Tax",
    form: "Monthly Remittance Return (Form 1601-C)",
    tag: "BIR",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
  },
};

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatPeriod(startStr: string, endStr: string) {
  if (!startStr || !endStr) return "—";
  return `${formatDate(startStr)} – ${formatDate(endStr)}`;
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
  const [selectedRunId, setSelectedRunId] = useState<string>("INITIAL");
  const [multiRunViewMode, setMultiRunViewMode] = useState<"summary" | "detailed">("summary");

  const fetchData = useCallback(async (runIdToFetch?: string) => {
    setLoading(true);
    try {
      const targetId = runIdToFetch !== undefined ? runIdToFetch : selectedRunId;
      const url =
        targetId && targetId !== "ALL" && targetId !== "INITIAL"
          ? `/api/reports/contributions?payrollRunId=${targetId}`
          : `/api/reports/contributions`;

      const res = await fetch(url);
      if (res.ok) {
        const json: SummaryData = await res.json();
        setData(json);

        if (targetId === "INITIAL") {
          // Auto-select latest posted run if available
          const initialId = json.availableRuns?.[0]?.id || "ALL";
          setSelectedRunId(initialId);

          if (initialId !== "ALL") {
            const singleRunRes = await fetch(`/api/reports/contributions?payrollRunId=${initialId}`);
            if (singleRunRes.ok) {
              const singleRunJson: SummaryData = await singleRunRes.json();
              setData(singleRunJson);
            }
          }
        }
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

  const isAllRuns = selectedRunId === "ALL";
  const currentRun = !isAllRuns && groups.length > 0 ? groups[0] : null;

  return (
    <div className="space-y-6">
      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          title={isAllRuns ? "Total Contributions Due" : `Run #${currentRun?.runNumber ?? ""} Total Due`}
          value={`₱${grandTotalDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          subtitle={
            isAllRuns
              ? "Consolidated across all posted cutoffs"
              : currentRun
                ? `Cutoff: ${formatPeriod(currentRun.cutoffStart, currentRun.cutoffEnd)}`
                : "Computed directly from payroll"
          }
          icon={BanknoteIcon}
        />
        <MetricCard
          title={isAllRuns ? "Remitted to Government" : `Run #${currentRun?.runNumber ?? ""} Remitted`}
          value={`₱${grandTotalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          subtitle={
            isAllRuns
              ? "Tagged as PAID by company"
              : currentRun
                ? `${currentRun.agencies.filter((a) => a.status === "PAID").length} of ${currentRun.agencies.length} obligations paid`
                : "Tagged as PAID"
          }
          icon={CheckCircle2Icon}
        />
        <MetricCard
          title={isAllRuns ? "Pending Remittances" : `Run #${currentRun?.runNumber ?? ""} Pending`}
          value={`₱${grandTotalPending.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          subtitle={
            isAllRuns
              ? "Awaiting payment tagging"
              : currentRun
                ? `${currentRun.agencies.filter((a) => a.status !== "PAID").length} obligations awaiting remittance`
                : "Awaiting payment"
          }
          icon={ClockIcon}
        />
      </div>

      {/* Filter Toolbar Card */}
      <Card className="border-slate-200/90 shadow-xs dark:border-slate-800">
        <CardContent className="p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Payroll Cutoff Run:
            </span>
            <div className="w-72">
              <Select
                value={selectedRunId === "INITIAL" ? (availableRuns[0]?.id || "ALL") : selectedRunId}
                onValueChange={(v) => {
                  const nextId = v || "ALL";
                  setSelectedRunId(nextId);
                  fetchData(nextId);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Payroll Run" />
                </SelectTrigger>
                <SelectContent>
                  {availableRuns.length > 0 && (
                    <SelectItem value={availableRuns[0].id} className="text-xs font-semibold">
                      Latest — Run #{availableRuns[0].runNumber} ({formatPeriod(availableRuns[0].cutoffStart, availableRuns[0].cutoffEnd)})
                    </SelectItem>
                  )}
                  {availableRuns.slice(1).map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      Run #{r.runNumber} ({formatPeriod(r.cutoffStart, r.cutoffEnd)})
                    </SelectItem>
                  ))}
                  <SelectItem value="ALL" className="text-xs font-semibold text-blue-600">
                    All Posted Runs (Consolidated Overview)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Building2Icon className="size-3.5 text-slate-400" />
              <span>
                Company: <strong className="text-slate-800 dark:text-slate-200">{data?.company.legalName}</strong> ({data?.company.companyCode})
              </span>
            </div>
            {data?.company.tin && (
              <span className="text-slate-400 font-mono hidden md:inline">
                · TIN: {data.company.tin}
              </span>
            )}
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
      ) : isAllRuns ? (
        /* Consolidated Multi-Run View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">View Format:</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setMultiRunViewMode("summary")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                    multiRunViewMode === "summary"
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100 font-semibold"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                  )}
                >
                  <TablePropertiesIcon className="size-3.5" /> Consolidated Table
                </button>
                <button
                  type="button"
                  onClick={() => setMultiRunViewMode("detailed")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                    multiRunViewMode === "detailed"
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100 font-semibold"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                  )}
                >
                  <LayoutGridIcon className="size-3.5" /> Detailed Run Cards
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Showing {groups.length} posted payroll {groups.length === 1 ? "run" : "runs"}
            </p>
          </div>

          {multiRunViewMode === "summary" ? (
            /* Consolidated Summary Table */
            <Card className="border-slate-200/90 shadow-xs dark:border-slate-800 overflow-hidden">
              <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <LayersIcon className="size-4 text-blue-600" />
                    All Posted Payroll Runs — Consolidated Statutory Summary
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Obligations across all posted cutoffs. Click &quot;Manage Run&quot; to inspect agency breakdowns and tag check payments.
                  </CardDescription>
                </div>

                <Badge variant="outline" className="text-xs px-2.5 py-1 font-semibold bg-slate-100 dark:bg-slate-800">
                  {groups.length} Posted Runs
                </Badge>
              </CardHeader>

              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800">
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 pl-6">
                        Payroll Run &amp; Cutoff
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Pay Date
                      </TableHead>
                      <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        SSS Due
                      </TableHead>
                      <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        PhilHealth Due
                      </TableHead>
                      <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Pag-IBIG Due
                      </TableHead>
                      <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Withholding Tax
                      </TableHead>
                      <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Total Run Due
                      </TableHead>
                      <TableHead className="text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Remittance Status
                      </TableHead>
                      <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 pr-6">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((grp) => {
                      const sss = grp.agencies.find((a) => a.agency === "SSS")?.totalAmount || 0;
                      const phic = grp.agencies.find((a) => a.agency === "PHILHEALTH")?.totalAmount || 0;
                      const hdmf = grp.agencies.find((a) => a.agency === "PAGIBIG")?.totalAmount || 0;
                      const bir = grp.agencies.find((a) => a.agency === "BIR")?.totalAmount || 0;
                      const paidCount = grp.agencies.filter((a) => a.status === "PAID").length;
                      const isFullyRemitted = paidCount === grp.agencies.length;

                      return (
                        <TableRow
                          key={grp.payrollRunId}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60"
                        >
                          <TableCell className="py-3 pl-6">
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRunId(grp.payrollRunId);
                                  fetchData(grp.payrollRunId);
                                }}
                                className="font-bold text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline text-left"
                              >
                                Run #{grp.runNumber}
                              </button>
                              <p className="text-[11px] text-slate-400">
                                {formatPeriod(grp.cutoffStart, grp.cutoffEnd)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                            {formatDate(grp.payDate)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400">
                            ₱{sss.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400">
                            ₱{phic.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400">
                            ₱{hdmf.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400">
                            ₱{bir.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-slate-900 dark:text-slate-100">
                            ₱{grp.totalDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-center">
                            <StatusBadge
                              status={isFullyRemitted ? "PAID" : paidCount > 0 ? "PARTIALLY_PAID" : "UNPAID"}
                              label={isFullyRemitted ? "REMITTED" : `${paidCount} / ${grp.agencies.length} REMITTED`}
                              size="sm"
                            />
                          </TableCell>
                          <TableCell className="text-right pr-6 py-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2.5 text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 gap-1"
                              onClick={() => {
                                setSelectedRunId(grp.payrollRunId);
                                fetchData(grp.payrollRunId);
                              }}
                            >
                              Manage Run <ArrowRightIcon className="size-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-slate-50/90 dark:bg-slate-900/90 font-bold border-t-2 border-slate-200/90 dark:border-slate-800">
                      <TableCell colSpan={2} className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider pl-6">
                        Grand Totals (All Runs)
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-slate-700 dark:text-slate-300">
                        ₱{groups.reduce((sum, g) => sum + (g.agencies.find((a) => a.agency === "SSS")?.totalAmount || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-slate-700 dark:text-slate-300">
                        ₱{groups.reduce((sum, g) => sum + (g.agencies.find((a) => a.agency === "PHILHEALTH")?.totalAmount || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-slate-700 dark:text-slate-300">
                        ₱{groups.reduce((sum, g) => sum + (g.agencies.find((a) => a.agency === "PAGIBIG")?.totalAmount || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-slate-700 dark:text-slate-300">
                        ₱{groups.reduce((sum, g) => sum + (g.agencies.find((a) => a.agency === "BIR")?.totalAmount || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-blue-700 dark:text-blue-400">
                        ₱{grandTotalDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell colSpan={2} className="text-right text-xs font-medium text-slate-500 pr-6">
                        Remitted: <strong className="text-emerald-600 font-mono">₱{grandTotalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong> · Pending: <strong className="text-amber-600 font-mono">₱{grandTotalPending.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          ) : (
            /* Multi-Run Cards View */
            <div className="space-y-6">
              {groups.map((grp) => renderRunDetailCard(grp))}
            </div>
          )}
        </div>
      ) : (
        /* Single Run View */
        <div className="space-y-6">
          {groups.map((grp) => renderRunDetailCard(grp))}
        </div>
      )}
    </div>
  );

  function renderRunDetailCard(grp: RunGroup) {
    const periodEnd = new Date(grp.cutoffEnd);
    const periodYear = periodEnd.getUTCFullYear();
    const periodMonth = periodEnd.getUTCMonth() + 1;
    const remittedAgencies = grp.agencies.filter((a) => a.status === "PAID").length;

    return (
      <Card key={grp.payrollRunId} className="border-slate-200/90 shadow-xs dark:border-slate-800 overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheckIcon className="size-4 text-blue-600" />
              Payroll Run #{grp.runNumber} — Statutory Contributions &amp; Remittance
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Cutoff Period: {formatPeriod(grp.cutoffStart, grp.cutoffEnd)} · Disbursed: {formatDate(grp.payDate)}
            </CardDescription>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-right">
              <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Run Total Due</p>
              <p className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
                ₱{grp.totalDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="h-7 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] px-2.5 py-1 font-semibold",
                remittedAgencies === grp.agencies.length
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300"
              )}
            >
              {remittedAgencies} of {grp.agencies.length} Remitted
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 py-3 pl-6 w-[280px]">
                  Government Agency &amp; Return Form
                </TableHead>
                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-[140px]">
                  Employee Share (EE)
                </TableHead>
                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-[140px]">
                  Employer Share (ER)
                </TableHead>
                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-[150px]">
                  Total Amount Due
                </TableHead>
                <TableHead className="text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-[120px]">
                  Status
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Payment &amp; Check Details
                </TableHead>
                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 pr-6 w-[120px]">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grp.agencies.map((ag) => {
                const cfg = AGENCY_CONFIG[ag.agency] || {
                  name: ag.label || ag.agency,
                  form: "Official Remittance Return",
                  tag: ag.agency,
                  badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
                };
                const isPaid = ag.status === "PAID";
                const isBir = ag.agency === "BIR";

                return (
                  <TableRow
                    key={ag.agency}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60"
                  >
                    <TableCell className="py-3.5 pl-6">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center font-mono font-bold text-[11px] min-w-[42px] px-2 py-0.5 rounded border text-center shrink-0 tracking-wide",
                            cfg.badgeClass
                          )}
                        >
                          {cfg.tag}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {cfg.name}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">
                            {cfg.form}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400">
                      {isBir ? "—" : `₱${ag.eeAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400">
                      {isBir ? "—" : `₱${ag.erAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-slate-900 dark:text-slate-100">
                      ₱{ag.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge
                        status={ag.status}
                        label={isPaid ? "REMITTED" : ag.status === "PARTIALLY_PAID" ? "PARTIAL" : "PENDING"}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell className="text-xs">
                      {isPaid ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {ag.checkNumber ? (
                              <span className="inline-flex items-center gap-1 font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                                <CreditCardIcon className="size-3 text-blue-500 shrink-0" />
                                Check #{ag.checkNumber}
                              </span>
                            ) : ag.paymentMethod ? (
                              <span className="inline-flex items-center font-medium text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {ag.paymentMethod.replace("_", " ")}
                              </span>
                            ) : null}
                            {ag.paymentDate && (
                              <span className="text-[11px] text-slate-500">
                                on {formatDate(ag.paymentDate)}
                              </span>
                            )}
                          </div>
                          {(ag.referenceNumber || ag.bankName) && (
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                              {ag.referenceNumber && (
                                <span>
                                  Ref/OR: <strong className="font-mono text-slate-700 dark:text-slate-300">{ag.referenceNumber}</strong>
                                </span>
                              )}
                              {ag.bankName && <span className="text-slate-400">· {ag.bankName}</span>}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-2 pr-6">
                      {canManage && (
                        <TagStatutoryPaymentDialog
                          agencyData={ag}
                          payrollRunId={grp.payrollRunId}
                          runNumber={grp.runNumber}
                          periodYear={periodYear}
                          periodMonth={periodMonth}
                          companyBankAccounts={companyBankAccounts}
                          onSuccess={() => fetchData(selectedRunId)}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-slate-50/90 dark:bg-slate-900/90 font-bold border-t-2 border-slate-200/90 dark:border-slate-800">
                <TableCell className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider pl-6">
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
                <TableCell colSpan={3} className="text-right text-xs font-medium text-slate-500 pr-6">
                  Remitted: <strong className="text-emerald-600 font-mono">₱{grp.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong> · Pending: <strong className="text-amber-600 font-mono">₱{grp.totalPending.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    );
  }
}
