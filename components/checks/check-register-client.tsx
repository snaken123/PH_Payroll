"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CreditCardIcon,
  SearchIcon,
  FilterIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  BanIcon,
  PlusIcon,
  CalendarDaysIcon,
  WalletIcon,
  UsersIcon,
  LandmarkIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RecordCheckDialog, type CompanyBankOption, type ExistingCheck, type PostedRunOption } from "@/components/payroll/record-check-dialog";
import { toast } from "sonner";
import Link from "next/link";

interface CheckRegisterClientProps {
  initialBankAccounts: CompanyBankOption[];
  canManage: boolean;
}

export function CheckRegisterClient({ initialBankAccounts, canManage }: CheckRegisterClientProps) {
  const [checks, setChecks] = useState<ExistingCheck[]>([]);
  const [bankAccounts, setBankAccounts] = useState<CompanyBankOption[]>(initialBankAccounts);
  const [availableRuns, setAvailableRuns] = useState<PostedRunOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [sourceType, setSourceType] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchChecks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (sourceType && sourceType !== "ALL") params.set("sourceType", sourceType);
      if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/checks?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load checks");
      }
      const data = await res.json();
      setChecks(data.checks || []);
      if (data.companyBankAccounts) setBankAccounts(data.companyBankAccounts);
      if (data.availablePostedRuns) setAvailableRuns(data.availablePostedRuns);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error loading checks");
    } finally {
      setLoading(false);
    }
  }, [search, sourceType, statusFilter, startDate, endDate]);

  useEffect(() => {
    fetchChecks();
  }, [fetchChecks]);

  const handleVoidCheck = async (check: ExistingCheck) => {
    if (!confirm(`Are you sure you want to void Check #${check.checkNumber}? This will mark the check as VOID.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/checks/${check.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to void check");
      }
      toast.success(`Check #${check.checkNumber} has been voided.`);
      fetchChecks();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error voiding check");
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const validChecks = checks.filter((c) => c.status !== "VOID");
    const totalDisbursed = validChecks.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const issuedCount = validChecks.filter((c) => c.status === "ISSUED").length;
    const clearedCount = validChecks.filter((c) => c.status === "CLEARED").length;
    const voidCount = checks.filter((c) => c.status === "VOID").length;

    const payrollRunTotal = validChecks
      .filter((c) => c.sourceType === "PAYROLL_RUN" || Boolean(c.payrollRun))
      .reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const separationTotal = validChecks
      .filter((c) => c.sourceType === "SEPARATION_PAY" || Boolean(c.finalPayRun))
      .reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const statutoryTotal = validChecks
      .filter((c) => c.sourceType === "STATUTORY_REMITTANCE" || Boolean(c.statutoryPaymentRecord))
      .reduce((sum, c) => sum + Number(c.amount || 0), 0);

    return {
      totalDisbursed,
      totalCount: checks.length,
      issuedCount,
      clearedCount,
      voidCount,
      payrollRunTotal,
      separationTotal,
      statutoryTotal,
    };
  }, [checks]);

  const getSourceBadge = (c: ExistingCheck) => {
    if (c.sourceType === "SEPARATION_PAY" || c.finalPayRun) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
          <UsersIcon className="size-3" />
          Separation Pay
        </span>
      );
    }
    if (c.sourceType === "STATUTORY_REMITTANCE" || c.statutoryPaymentRecord) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          <LandmarkIcon className="size-3" />
          Gov&apos;t Remittance
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
        <WalletIcon className="size-3" />
        Payroll Run
      </span>
    );
  };

  const getSourceReference = (c: ExistingCheck) => {
    if (c.finalPayRun) {
      return (
        <div className="text-xs">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Final Pay #{c.finalPayRun.finalPayNumber}
          </span>
          <span className="text-slate-500 block text-[11px]">
            {c.finalPayRun.employee?.lastName}, {c.finalPayRun.employee?.firstName}
          </span>
        </div>
      );
    }
    if (c.statutoryPaymentRecord) {
      return (
        <div className="text-xs">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {c.statutoryPaymentRecord.agency}
          </span>
          <span className="text-slate-500 block text-[11px]">
            Period: {c.statutoryPaymentRecord.periodMonth}/{c.statutoryPaymentRecord.periodYear}
          </span>
        </div>
      );
    }
    if (c.sourceType === "STATUTORY_REMITTANCE") {
      const batchItems = (c as any).remittanceBatchItems || [];
      const agency = batchItems[0]?.agency || c.payee || "Statutory Agency";
      return (
        <div className="text-xs">
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            {agency} Remittance
          </span>
          <span className="text-slate-500 block text-[11px]">
            {batchItems.length > 0 ? `${batchItems.length} items bundled` : c.notes || "Statutory Payment"}
          </span>
        </div>
      );
    }
    if (c.payrollRun) {
      return (
        <div className="text-xs">
          <Link
            href={`/dashboard/payroll/${c.payrollRun.id}`}
            className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            Payroll Run #{c.payrollRun.runNumber}
          </Link>
          {c.payrollRun.payrollPeriod && (
            <span className="text-slate-500 block text-[11px]">
              {new Date(c.payrollRun.payrollPeriod.cutoffStart).toLocaleDateString()} -{" "}
              {new Date(c.payrollRun.payrollPeriod.cutoffEnd).toLocaleDateString()}
            </span>
          )}
        </div>
      );
    }
    return <span className="text-xs text-slate-400">Manual Check</span>;
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "CLEARED":
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] gap-1">
            <CheckCircle2Icon className="size-3" />
            CLEARED
          </Badge>
        );
      case "VOID":
        return (
          <Badge variant="destructive" className="text-[10px] gap-1">
            <BanIcon className="size-3" />
            VOID
          </Badge>
        );
      case "ISSUED":
      default:
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px] gap-1">
            <AlertCircleIcon className="size-3" />
            ISSUED
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200/90 shadow-xs dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Disbursed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
              ₱{stats.totalDisbursed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Active checks across all sources
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-xs dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Payroll Runs</span>
              <WalletIcon className="size-3.5 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
              ₱{stats.payrollRunTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Semi-monthly net payroll payouts
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-xs dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Separation &amp; Final Pay</span>
              <UsersIcon className="size-3.5 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
              ₱{stats.separationTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Final pay &amp; clearance disbursements
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-xs dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Gov&apos;t Remittances</span>
              <LandmarkIcon className="size-3.5 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              ₱{stats.statutoryTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              SSS, PhilHealth, Pag-IBIG, BIR checks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200/90 shadow-xs dark:border-slate-800">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2 min-w-[240px]">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
                <Input
                  placeholder="Search check number, payee, bank, or notes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Source Type Filter */}
              <Select value={sourceType} onValueChange={(val) => setSourceType(val ?? "ALL")}>
                <SelectTrigger className="w-[170px] h-9 text-xs">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Sources</SelectItem>
                  <SelectItem value="PAYROLL_RUN">Payroll Run</SelectItem>
                  <SelectItem value="SEPARATION_PAY">Separation Pay</SelectItem>
                  <SelectItem value="STATUTORY_REMITTANCE">Gov&apos;t Remittance</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? "ALL")}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="ISSUED">Issued</SelectItem>
                  <SelectItem value="CLEARED">Cleared</SelectItem>
                  <SelectItem value="VOID">Void</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Filters */}
              <div className="flex items-center gap-1 text-xs">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-xs w-[130px] font-mono"
                  title="From date"
                />
                <span className="text-slate-400">to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-xs w-[130px] font-mono"
                  title="To date"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchChecks()}
                className="h-9 px-2.5 text-xs"
                title="Refresh"
              >
                <RefreshCwIcon className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>

              {canManage && (
                <RecordCheckDialog
                  companyBankAccounts={bankAccounts}
                  availableRuns={availableRuns}
                  onSuccess={fetchChecks}
                  triggerButton={
                    <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white">
                      <PlusIcon className="size-3.5" />
                      Record Check
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checks Register Table */}
      <Card className="border-slate-200/90 shadow-xs dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CreditCardIcon className="size-4 text-blue-600" />
              Check Disbursements Register
            </CardTitle>
            <CardDescription className="text-xs">
              Complete line item record of all checks issued across Payroll Runs, Separation Pay, and Statutory Remittances.
            </CardDescription>
          </div>
          <div className="text-xs text-slate-500">
            Total records: <strong className="text-slate-800 dark:text-slate-200">{checks.length}</strong>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Check #</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Date</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Source</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Source Details</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Payee</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Disbursing Bank</TableHead>
                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Amount</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Notes</TableHead>
                {canManage && (
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-24">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 10 : 9} className="h-32 text-center text-xs text-slate-500">
                    Loading check register...
                  </TableCell>
                </TableRow>
              ) : checks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 10 : 9} className="h-32 text-center text-xs text-slate-500">
                    No checks found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                checks.map((c) => {
                  const isVoid = c.status === "VOID";
                  return (
                    <TableRow
                      key={c.id}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${
                        isVoid ? "opacity-60 bg-slate-50/30 dark:bg-slate-900/30 line-through" : ""
                      }`}
                    >
                      <TableCell className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                        {c.checkNumber}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(c.checkDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {getSourceBadge(c)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {getSourceReference(c)}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-800 dark:text-slate-200 max-w-[180px] truncate">
                        {c.payee || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-300 max-w-[160px] truncate">
                        {c.bankName || "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs whitespace-nowrap">
                        ₱{Number(c.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {getStatusBadge(c.status)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-[140px] truncate">
                        {c.notes || "—"}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <RecordCheckDialog
                              existingCheck={c}
                              companyBankAccounts={bankAccounts}
                              availableRuns={availableRuns}
                              onSuccess={fetchChecks}
                            />
                            {!isVoid && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleVoidCheck(c)}
                                className="h-7 px-2 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              >
                                Void
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
