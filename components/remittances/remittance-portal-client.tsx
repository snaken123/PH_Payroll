"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  LandmarkIcon,
  CoinsIcon,
  CheckCircle2Icon,
  ClockIcon,
  SearchIcon,
  FilterIcon,
  Building2Icon,
  CreditCardIcon,
  PrinterIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  BookOpenIcon,
  CheckSquareIcon,
  SquareIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { StatutoryAgency, StatutoryPaymentStatus } from "@/lib/generated/prisma/enums";
import {
  type ConsolidatedPayableItem,
  type ConsolidatedSummaryMetrics,
} from "@/types/remittance";
import { IssueRemittanceCheckDialog } from "./issue-remittance-check-dialog";
import { CheckVoucherModal } from "./check-voucher-modal";
import { RemittanceChecksTable } from "./remittance-checks-table";
import { StatutoryGuidelines } from "./statutory-guidelines";

interface RemittancePortalClientProps {
  initialData?: {
    items: ConsolidatedPayableItem[];
    metrics: ConsolidatedSummaryMetrics;
    companies: any[];
  } | null;
}

export function RemittancePortalClient({ initialData }: RemittancePortalClientProps) {
  const [activeTab, setActiveTab] = useState<"payables" | "checks" | "guidelines">("payables");

  // Data states
  const [items, setItems] = useState<ConsolidatedPayableItem[]>(initialData?.items || []);
  const [metrics, setMetrics] = useState<ConsolidatedSummaryMetrics | null>(
    initialData?.metrics || null
  );
  const [companies, setCompanies] = useState<any[]>(initialData?.companies || []);
  const [loading, setLoading] = useState(false);

  // Remittance Checks data
  const [checks, setChecks] = useState<any[]>([]);
  const [checksLoading, setChecksLoading] = useState(false);

  // Filter states
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("ALL");
  const [selectedAgency, setSelectedAgency] = useState<StatutoryAgency | "ALL">("ALL");
  const [selectedItemType, setSelectedItemType] = useState<"ALL" | "CONTRIBUTION" | "LOAN">("ALL");
  const [selectedStatus, setSelectedStatus] = useState<StatutoryPaymentStatus | "ALL">("UNPAID");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | "ALL">("ALL");

  // Selection states for check batching
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Dialog states
  const [checkDialogOpen, setCheckDialogOpen] = useState(false);
  const [selectedCheckForVoucher, setSelectedCheckForVoucher] = useState<any | null>(null);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);

  // Fetch Consolidated Payables
  const fetchPayables = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCompanyId && selectedCompanyId !== "ALL") params.set("companyId", selectedCompanyId);
      if (selectedAgency && selectedAgency !== "ALL") params.set("agency", selectedAgency);
      if (selectedItemType && selectedItemType !== "ALL") params.set("itemType", selectedItemType);
      if (selectedStatus && selectedStatus !== "ALL") params.set("status", selectedStatus);
      if (selectedYear) params.set("year", selectedYear.toString());
      if (selectedMonth && selectedMonth !== "ALL") params.set("month", selectedMonth.toString());
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/remittances/payables?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch payables");
      const data = await res.json();
      setItems(data.items || []);
      setMetrics(data.metrics || null);
      if (data.companies) setCompanies(data.companies);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load statutory payables.");
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, selectedAgency, selectedItemType, selectedStatus, selectedYear, selectedMonth, searchQuery]);

  // Fetch Disbursed Checks
  const fetchChecks = useCallback(async () => {
    setChecksLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCompanyId && selectedCompanyId !== "ALL") params.set("companyId", selectedCompanyId);
      if (selectedAgency && selectedAgency !== "ALL") params.set("agency", selectedAgency);

      const res = await fetch(`/api/remittances/checks?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch remittance checks");
      const data = await res.json();
      setChecks(data.checks || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load remittance checks register.");
    } finally {
      setChecksLoading(false);
    }
  }, [selectedCompanyId, selectedAgency]);

  // Load initial payables
  useEffect(() => {
    fetchPayables();
  }, [fetchPayables]);

  // Load checks on tab switch
  useEffect(() => {
    if (activeTab === "checks") {
      fetchChecks();
    }
  }, [activeTab, fetchChecks]);

  // Selected items objects
  const selectedItemsList = useMemo(() => {
    return items.filter((i) => selectedItemIds.has(i.id));
  }, [items, selectedItemIds]);

  const selectedTotalAmount = useMemo(() => {
    return selectedItemsList.reduce((sum, i) => sum + i.totalAmount, 0);
  }, [selectedItemsList]);

  // Selection toggle handlers
  const toggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItemIds.size === items.length && items.length > 0) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedItemIds(new Set());
  };

  const handleCheckIssued = (createdCheck: any) => {
    setSelectedItemIds(new Set());
    fetchPayables();
    if (activeTab === "checks") {
      fetchChecks();
    }
    // Show voucher
    setSelectedCheckForVoucher(createdCheck);
    setVoucherModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Module Title & Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl flex items-center gap-2.5">
              <LandmarkIcon className="size-6 text-emerald-400" />
              Statutory Contributions &amp; Remittance Console
            </h1>
            <Badge variant="outline" className="text-[10px] bg-emerald-950/60 border-emerald-500/40 text-emerald-400 font-mono">
              SEC &amp; BIR Treasury
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Consolidated cross-company portal to calculate, verify, bundle into checks, and remit SSS, PhilHealth, Pag-IBIG, and BIR obligations.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("payables")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "payables"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/60"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <CoinsIcon className="size-3.5" /> Consolidated Payables
          </button>
          <button
            onClick={() => setActiveTab("checks")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "checks"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/60"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <CreditCardIcon className="size-3.5" /> Disbursed Checks
          </button>
          <button
            onClick={() => setActiveTab("guidelines")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "guidelines"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/60"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BookOpenIcon className="size-3.5" /> Agency Guidelines
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <ClockIcon className="size-3" /> Total Pending
            </span>
            <p className="text-lg font-black font-mono text-amber-300">
              {formatCurrency(metrics.grandTotalPending)}
            </p>
            <span className="text-[10px] text-slate-400">{metrics.pendingCount} unpaid items</span>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <CheckCircle2Icon className="size-3" /> Total Remitted
            </span>
            <p className="text-lg font-black font-mono text-emerald-300">
              {formatCurrency(metrics.grandTotalPaid)}
            </p>
            <span className="text-[10px] text-slate-400">{metrics.paidCount} remitted items</span>
          </div>

          <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-3 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
              SSS Pending
            </span>
            <p className="text-lg font-black font-mono text-blue-300">
              {formatCurrency(metrics.sssPending)}
            </p>
            <span className="text-[10px] text-slate-400">Due: {formatCurrency(metrics.sssDue)}</span>
          </div>

          <div className="rounded-xl border border-teal-500/30 bg-teal-950/20 p-3 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
              PhilHealth Pending
            </span>
            <p className="text-lg font-black font-mono text-teal-300">
              {formatCurrency(metrics.philhealthPending)}
            </p>
            <span className="text-[10px] text-slate-400">Due: {formatCurrency(metrics.philhealthDue)}</span>
          </div>

          <div className="rounded-xl border border-yellow-500/30 bg-yellow-950/20 p-3 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-400">
              Pag-IBIG Pending
            </span>
            <p className="text-lg font-black font-mono text-yellow-300">
              {formatCurrency(metrics.pagibigPending)}
            </p>
            <span className="text-[10px] text-slate-400">Due: {formatCurrency(metrics.pagibigDue)}</span>
          </div>

          <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
              BIR 1601-C Pending
            </span>
            <p className="text-lg font-black font-mono text-rose-300">
              {formatCurrency(metrics.birPending)}
            </p>
            <span className="text-[10px] text-slate-400">Due: {formatCurrency(metrics.birDue)}</span>
          </div>
        </div>
      )}

      {/* TAB 1: CONSOLIDATED PAYABLES */}
      {activeTab === "payables" && (
        <div className="space-y-4">
          {/* Controls & Filters Bar */}
          <Card className="border-slate-800 bg-slate-900/80 shadow-md">
            <CardContent className="p-4 space-y-3.5">
              {/* Row 1: Company & Search */}
              <div className="flex flex-col md:flex-row items-center gap-3">
                <div className="w-full md:w-64 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Target Company</span>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs h-9 px-2.5 rounded-lg text-slate-100 focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="ALL">All Companies (Consolidated)</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.legalName} ({c.companyCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full md:w-36 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Year</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-xs h-9 px-2.5 rounded-lg text-slate-100 focus:outline-hidden focus:border-emerald-500"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full md:w-36 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Month</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-xs h-9 px-2.5 rounded-lg text-slate-100 focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="ALL">All Months</option>
                    {[
                      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                    ].map((m, idx) => (
                      <option key={m} value={idx + 1}>
                        {m} ({idx + 1})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full flex-1 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Search Line Items</span>
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-2.5 size-4 text-slate-500" />
                    <Input
                      placeholder="Search company, employee name, loan ref, PRN, or check..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-slate-950 border-slate-800 text-xs h-9 text-slate-100"
                    />
                  </div>
                </div>

                <div className="self-end pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={fetchPayables}
                    disabled={loading}
                    className="bg-slate-950 border-slate-800 text-xs h-9 px-3 gap-1.5"
                  >
                    <RefreshCwIcon className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
                  </Button>
                </div>
              </div>

              {/* Row 2: Pills for Agency, ItemType, and Status */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                {/* Agency Pills */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">Agency:</span>
                  {(["ALL", "SSS", "PHILHEALTH", "PAGIBIG", "BIR"] as const).map((ag) => (
                    <button
                      key={ag}
                      onClick={() => setSelectedAgency(ag)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors ${
                        selectedAgency === ag
                          ? "bg-slate-200 text-slate-900 border-white font-bold"
                          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {ag}
                    </button>
                  ))}
                </div>

                {/* Obligation Type Pills */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">Type:</span>
                  {(["ALL", "CONTRIBUTION", "LOAN"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedItemType(t)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors ${
                        selectedItemType === t
                          ? "bg-emerald-600 text-white border-emerald-500 font-bold"
                          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {t === "ALL" ? "All Types" : t === "CONTRIBUTION" ? "Regular Contributions" : "Member Loans"}
                    </button>
                  ))}
                </div>

                {/* Status Pills */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">Status:</span>
                  {(["ALL", "UNPAID", "PAID"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setSelectedStatus(st as any)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors ${
                        selectedStatus === st
                          ? "bg-blue-600 text-white border-blue-500 font-bold"
                          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {st === "ALL" ? "All" : st === "UNPAID" ? "Pending (Unpaid)" : "Remitted (Paid)"}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sticky Selection Action Bar */}
          {selectedItemIds.size > 0 && (
            <div className="sticky top-18 z-40 p-3.5 rounded-xl border border-emerald-500/60 bg-emerald-950/90 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 font-bold">
                  {selectedItemIds.size}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">
                      {selectedItemIds.size} items selected
                    </span>
                    <span className="text-slate-400 text-xs">•</span>
                    <span className="font-mono font-bold text-sm text-emerald-300">
                      Total: {formatCurrency(selectedTotalAmount)}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-200/80">
                    Ready to bundle into an official Philippine statutory disbursement check.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClearSelection}
                  className="bg-transparent border-emerald-500/40 text-emerald-200 text-xs h-9 hover:bg-emerald-900/50"
                >
                  Clear Selection
                </Button>
                <Button
                  size="sm"
                  onClick={() => setCheckDialogOpen(true)}
                  className="bg-white text-emerald-950 hover:bg-slate-100 font-bold text-xs h-9 px-4 shadow-lg shadow-black/40 gap-1.5"
                >
                  <CreditCardIcon className="size-3.5 text-emerald-800" />
                  Issue Remittance Check ({formatCurrency(selectedTotalAmount)}) →
                </Button>
              </div>
            </div>
          )}

          {/* Main Payables Table */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
            {loading ? (
              <div className="py-20 text-center text-xs text-slate-400">
                <RefreshCwIcon className="size-5 animate-spin mx-auto text-emerald-500 mb-2" />
                Aggregating statutory payables across companies...
              </div>
            ) : items.length === 0 ? (
              <div className="py-20 text-center text-xs text-slate-400">
                <CheckCircle2Icon className="size-8 text-emerald-500/60 mx-auto mb-2" />
                <p className="font-semibold text-slate-300">No statutory obligations matching your filters</p>
                <p className="text-slate-500 mt-1">Try selecting &quot;All Statuses&quot; or choosing another company.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900/90 border-slate-800">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedItemIds.size === items.length && items.length > 0}
                        onCheckedChange={toggleSelectAll}
                        className="border-slate-600 data-[state=checked]:bg-emerald-600"
                      />
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Company</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Agency</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Obligation Details</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Period / Cutoff</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Amount (PHP)</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment &amp; Check Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const isSelected = selectedItemIds.has(item.id);
                    const isPaid = item.status === StatutoryPaymentStatus.PAID;
                    const isLoan = item.itemType === "LOAN";

                    return (
                      <TableRow
                        key={item.id}
                        className={`border-slate-800 hover:bg-slate-800/40 transition-colors ${
                          isSelected ? "bg-emerald-950/20" : ""
                        }`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectItem(item.id)}
                            className="border-slate-600 data-[state=checked]:bg-emerald-600"
                          />
                        </TableCell>
                        <TableCell>
                          {isPaid ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono bg-emerald-950/60 border-emerald-500/50 text-emerald-400 flex items-center gap-1 w-fit"
                            >
                              <CheckCircle2Icon className="size-2.5" /> REMITTED
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono bg-amber-950/60 border-amber-500/50 text-amber-400 flex items-center gap-1 w-fit"
                            >
                              <ClockIcon className="size-2.5" /> PENDING
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="font-semibold text-xs text-slate-200 block truncate max-w-[150px]">
                              {item.companyName}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {item.companyCode} • TIN: {item.companyTin}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono font-bold ${
                              item.agency === "SSS"
                                ? "border-blue-500/40 text-blue-400 bg-blue-950/40"
                                : item.agency === "PHILHEALTH"
                                ? "border-teal-500/40 text-teal-400 bg-teal-950/40"
                                : item.agency === "PAGIBIG"
                                ? "border-amber-500/40 text-amber-400 bg-amber-950/40"
                                : "border-rose-500/40 text-rose-400 bg-rose-950/40"
                            }`}
                          >
                            {item.agency}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono uppercase px-1 py-0 rounded bg-slate-800 text-slate-300">
                                {item.itemType}
                              </span>
                              <span className="font-semibold text-xs text-slate-200">
                                {item.description}
                              </span>
                            </div>
                            {isLoan ? (
                              <p className="text-[11px] text-slate-400 font-mono">
                                Emp: {item.employeeName} ({item.employeeNumber}) • Ref: {item.loanReference || "—"}
                              </p>
                            ) : (
                              <p className="text-[11px] text-slate-400 font-mono">
                                EE Share: {formatCurrency(item.eeAmount || 0)} • ER Share: {formatCurrency(item.erAmount || 0)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-300">
                          {item.periodMonth}/{item.periodYear}
                          {item.cutoffEnd && (
                            <span className="text-[10px] text-slate-500 block">
                              End: {item.cutoffEnd}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-xs text-emerald-400">
                          {formatCurrency(item.totalAmount)}
                        </TableCell>
                        <TableCell>
                          {isPaid ? (
                            <div className="space-y-0.5 text-[11px]">
                              <span className="font-mono font-bold text-white block">
                                Check #{item.checkNumber || "PAID"}
                              </span>
                              <span className="text-slate-400 text-[10px] block">
                                Date: {item.checkDate || "—"} • Ref: {item.referenceNumber || "PRN"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Not yet disbursed</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DISBURSED CHECKS REGISTER */}
      {activeTab === "checks" && (
        <RemittanceChecksTable
          checks={checks}
          loading={checksLoading}
          onRefresh={fetchChecks}
        />
      )}

      {/* TAB 3: AGENCY GUIDELINES & DEADLINES */}
      {activeTab === "guidelines" && <StatutoryGuidelines />}

      {/* Issue Check Dialog */}
      <IssueRemittanceCheckDialog
        open={checkDialogOpen}
        onOpenChange={setCheckDialogOpen}
        selectedItems={selectedItemsList}
        companies={companies}
        onSuccess={handleCheckIssued}
      />

      {/* Check Voucher Modal */}
      <CheckVoucherModal
        open={voucherModalOpen}
        onOpenChange={setVoucherModalOpen}
        check={selectedCheckForVoucher}
      />
    </div>
  );
}
