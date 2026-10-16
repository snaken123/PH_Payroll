"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MetricCard } from "@/components/ui/metric-card";
import {
  CreditCardIcon,
  SearchIcon,
  FilterIcon,
  ExternalLinkIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  Loader2Icon,
  CalendarIcon,
  BanknoteIcon,
} from "lucide-react";

interface CheckRecord {
  id: string;
  checkNumber: string;
  checkDate: string;
  amount: number | string;
  bankName: string | null;
  payee: string | null;
  notes: string | null;
  status: string;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
  } | null;
  payrollRun: {
    id: string;
    runNumber: number;
    status: string;
    payrollPeriod: {
      cutoffStart: string;
      cutoffEnd: string;
      payDate: string;
    };
  };
}

export function CheckRegisterTab() {
  const [checks, setChecks] = useState<CheckRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchChecks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status && status !== "ALL") params.set("status", status);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/payroll/checks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setChecks(data.checks || []);
        setTotalCount(data.totalCount || 0);
        setTotalAmount(data.totalAmount || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search, status, startDate, endDate]);

  useEffect(() => {
    fetchChecks();
  }, [fetchChecks]);

  const activeChecks = checks.filter((c) => c.status !== "VOID");
  const clearedCount = checks.filter((c) => c.status === "CLEARED").length;

  return (
    <div className="space-y-6">
      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          title="Total Checks Issued"
          value={totalCount}
          subtitle={`${clearedCount} cleared · ${activeChecks.length - clearedCount} outstanding`}
          icon={CreditCardIcon}
        />
        <MetricCard
          title="Total Check Disbursements"
          value={`₱${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          subtitle="Funded payroll payouts"
          icon={BanknoteIcon}
        />
        <MetricCard
          title="Disbursement Status"
          value={activeChecks.length > 0 ? "Active Registry" : "No Checks"}
          subtitle="Audit-ready bank check tracking"
          icon={CheckCircle2Icon}
        />
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200/90 shadow-xs dark:border-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <Input
                placeholder="Search check number, bank, or payee..."
                className="pl-8 h-9 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="w-40">
              <Select value={status} onValueChange={(v) => setStatus(v || "ALL")}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">
                    All Statuses
                  </SelectItem>
                  <SelectItem value="ISSUED" className="text-xs">
                    Issued
                  </SelectItem>
                  <SelectItem value="CLEARED" className="text-xs">
                    Cleared
                  </SelectItem>
                  <SelectItem value="VOID" className="text-xs">
                    Void
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="date"
                title="Start Date"
                className="h-9 text-xs font-mono w-36"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-xs text-slate-400">to</span>
              <Input
                type="date"
                title="End Date"
                className="h-9 text-xs font-mono w-36"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {(search || status !== "ALL" || startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs"
                onClick={() => {
                  setSearch("");
                  setStatus("ALL");
                  setStartDate("");
                  setEndDate("");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="border-slate-200/90 shadow-xs dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CreditCardIcon className="size-4 text-blue-600" />
            Check Register ({checks.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Log of all checks issued to pay or fund posted payroll cutoffs.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2Icon className="size-4 animate-spin text-blue-600" /> Loading check register...
            </div>
          ) : checks.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CreditCardIcon className="size-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                No check records found
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Check numbers recorded on posted payroll runs will automatically appear in this central register.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800">
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Check Number
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Payroll Run &amp; Cutoff
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Check Date
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Issuing Bank / Account
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Payee / Purpose
                  </TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Amount (₱)
                  </TableHead>
                  <TableHead className="text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checks.map((chk) => {
                  const isVoid = chk.status === "VOID";
                  const isCleared = chk.status === "CLEARED";
                  const cutoffStart = new Date(chk.payrollRun.payrollPeriod.cutoffStart).toLocaleDateString();
                  const cutoffEnd = new Date(chk.payrollRun.payrollPeriod.cutoffEnd).toLocaleDateString();

                  return (
                    <TableRow key={chk.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <TableCell className="py-2.5">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                          #{chk.checkNumber}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Link
                          href={`/dashboard/payroll/${chk.payrollRun.id}`}
                          className="font-semibold text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          Run #{chk.payrollRun.runNumber}
                          <ExternalLinkIcon className="size-3 opacity-60" />
                        </Link>
                        <p className="text-[11px] text-slate-400">
                          {cutoffStart} – {cutoffEnd}
                        </p>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                        {new Date(chk.checkDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 dark:text-slate-300">
                        <p className="font-medium">
                          {chk.bankName || chk.bankAccount?.bankName || "Unspecified"}
                        </p>
                        {chk.bankAccount?.accountNumber && (
                          <p className="text-[11px] text-slate-400 font-mono">
                            Acc: {chk.bankAccount.accountNumber}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 dark:text-slate-300 max-w-[200px] truncate">
                        {chk.payee || "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-slate-900 dark:text-slate-100">
                        <span className={isVoid ? "line-through text-slate-400" : ""}>
                          ₱{Number(chk.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 font-semibold ${
                            isCleared
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : isVoid
                                ? "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400"
                                : "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300"
                          }`}
                        >
                          {chk.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 font-semibold text-slate-600 hover:text-blue-600"
                          render={<Link href={`/dashboard/payroll/${chk.payrollRun.id}`} />}
                        >
                          View Run
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
