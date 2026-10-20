"use client";

import { useState, useMemo, Fragment } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PayslipDetailDialog } from "@/components/payroll/payslip-detail-dialog";
import {
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Search,
  Eye,
  EyeOff,
  Clock,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

export interface RegisterPayslipItem {
  id: string;
  grossPay: string | number;
  totalStatutoryDeductions: string | number;
  totalOtherDeductions: string | number;
  netPay: string | number;
  employee: {
    employeeNumber: string;
    firstName: string;
    lastName: string;
  };
  lineItems: Array<{
    id: string;
    category: string;
    direction: string;
    description: string;
    amount: string | number;
    quantity?: string | number | null;
    rate?: string | number | null;
  }>;
}

interface CutoffPayslipsRegisterProps {
  payslips: RegisterPayslipItem[];
  cutoffEndFormatted?: string;
}

export function CutoffPayslipsRegister({
  payslips,
  cutoffEndFormatted,
}: CutoffPayslipsRegisterProps) {
  // Column display toggle: "DETAILED" shows Overtime & Lates/Undertime columns; "COMPACT" collapses them
  const [showAttendanceColumns, setShowAttendanceColumns] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());

  // Filter payslips by search query
  const filteredPayslips = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return payslips;
    return payslips.filter((p) => {
      const fullName = `${p.employee.firstName} ${p.employee.lastName}`.toLowerCase();
      const num = p.employee.employeeNumber.toLowerCase();
      return fullName.includes(q) || num.includes(q);
    });
  }, [payslips, searchQuery]);

  // Overall Totals
  const totals = useMemo(() => {
    let gross = 0;
    let statutory = 0;
    let other = 0;
    let net = 0;
    let overtime = 0;
    let lateUndertime = 0;

    for (const p of payslips) {
      gross += Number(p.grossPay || 0);
      statutory += Number(p.totalStatutoryDeductions || 0);
      other += Number(p.totalOtherDeductions || 0);
      net += Number(p.netPay || 0);

      const otSum = p.lineItems
        .filter((li) => li.category === "OVERTIME")
        .reduce((sum, li) => sum + Number(li.amount || 0), 0);
      overtime += otSum;

      const lateSum = p.lineItems
        .filter(
          (li) =>
            li.category === "LATE_UNDERTIME_DEDUCTION" &&
            !li.description.toLowerCase().includes("absence")
        )
        .reduce((sum, li) => sum + Number(li.amount || 0), 0);
      lateUndertime += lateSum;
    }

    return { gross, statutory, other, net, overtime, lateUndertime };
  }, [payslips]);

  function toggleRowExpand(id: string) {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleToggleAllExpand() {
    if (expandedRowIds.size === filteredPayslips.length && filteredPayslips.length > 0) {
      setExpandedRowIds(new Set());
    } else {
      setExpandedRowIds(new Set(filteredPayslips.map((p) => p.id)));
    }
  }

  if (payslips.length === 0) {
    return (
      <Card className="border-slate-200/90 shadow-xs dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Cutoff Payslips Register (0)
          </CardTitle>
          <CardDescription className="text-xs">
            Itemized employee earnings, statutory deductions, loan repayments, and net pay.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="py-12 text-center space-y-3">
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 max-w-lg mx-auto text-sm space-y-2">
              <p className="font-semibold">Why are there 0 payslips in this run?</p>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                No active employees with compensation records effective on or before {cutoffEndFormatted ?? "cutoff end"} were found.
              </p>
              <div className="pt-1 flex items-center justify-center gap-3">
                <Button size="sm" variant="outline" render={<Link href="/dashboard/employees" />}>
                  Go to Employee Directory &rarr;
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const colSpanCount = showAttendanceColumns ? 8 : 6;

  return (
    <Card className="border-slate-200/90 shadow-xs dark:border-slate-800">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Cutoff Payslips Register ({payslips.length})
            </CardTitle>
            {totals.overtime > 0 && (
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-400 gap-1 font-semibold">
                <TrendingUp className="size-3" />
                OT: ₱{totals.overtime.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </Badge>
            )}
            {totals.lateUndertime > 0 && (
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-400 gap-1 font-semibold">
                <Clock className="size-3" />
                Late/UT: ₱{totals.lateUndertime.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs mt-0.5">
            Itemized employee earnings, attendance adjustments, statutory deductions, loan repayments, and net pay.
          </CardDescription>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Filter */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs w-44"
            />
          </div>

          {/* Attendance Columns Visibility Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAttendanceColumns((prev) => !prev)}
            className="h-8 text-xs gap-1.5 font-medium"
            title={showAttendanceColumns ? "Collapse attendance columns for a compact view" : "Expand attendance columns (Overtime & Lates)"}
          >
            {showAttendanceColumns ? (
              <>
                <EyeOff className="size-3.5" />
                Collapse OT/Lates
              </>
            ) : (
              <>
                <Eye className="size-3.5" />
                Expand OT/Lates
              </>
            )}
          </Button>

          {/* Expand/Collapse All Rows Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleAllExpand}
            className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            title="Expand/Collapse all row details"
          >
            <ChevronsUpDown className="size-3.5" />
            {expandedRowIds.size === filteredPayslips.length && filteredPayslips.length > 0
              ? "Collapse Rows"
              : "Expand Rows"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800">
              <TableHead className="w-8 px-2"></TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Employee Name</TableHead>
              {showAttendanceColumns && (
                <>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Overtime
                  </TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Lates &amp; Undertime
                  </TableHead>
                </>
              )}
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Gross Pay</TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Statutory Deductions</TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Loans &amp; Other</TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Net Pay</TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 pr-4">Payslip Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayslips.map((p) => {
              const isExpanded = expandedRowIds.has(p.id);
              const employeeName = `${p.employee.lastName}, ${p.employee.firstName} (${p.employee.employeeNumber})`;

              // Extract Overtime
              const otItems = p.lineItems.filter((li) => li.category === "OVERTIME");
              const overtimeAmount = otItems.reduce((sum, li) => sum + Number(li.amount || 0), 0);
              const overtimeHours = otItems.reduce((sum, li) => sum + Number(li.quantity || 0), 0);

              // Extract Late & Undertime (excluding pure Absences)
              const lateItems = p.lineItems.filter(
                (li) =>
                  li.category === "LATE_UNDERTIME_DEDUCTION" &&
                  !li.description.toLowerCase().includes("absence")
              );
              const lateUndertimeAmount = lateItems.reduce((sum, li) => sum + Number(li.amount || 0), 0);
              const lateUndertimeMinutes = lateItems.reduce((sum, li) => {
                const qty = Number(li.quantity || 0);
                if (qty > 0) {
                  return sum + (qty < 10 && !Number.isInteger(qty) ? Math.round(qty * 60) : Math.round(qty));
                }
                const descMatch = li.description.match(/(\d+(?:\.\d+)?)\s*(?:mins?|minutes?)/i);
                if (descMatch) {
                  return sum + Math.round(Number(descMatch[1]));
                }
                if (li.rate && Number(li.rate) > 0) {
                  return sum + Math.round((Number(li.amount || 0) / Number(li.rate)) * 60);
                }
                return sum;
              }, 0);

              // Check if any absence exists
              const absenceItems = p.lineItems.filter(
                (li) =>
                  li.category === "LATE_UNDERTIME_DEDUCTION" &&
                  li.description.toLowerCase().includes("absence")
              );
              const absenceAmount = absenceItems.reduce((sum, li) => sum + Number(li.amount || 0), 0);

              return (
                <Fragment key={p.id}>
                  <TableRow
                    className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                      isExpanded ? "bg-slate-50/50 dark:bg-slate-800/20" : ""
                    }`}
                    onClick={() => toggleRowExpand(p.id)}
                  >
                    <TableCell className="w-8 px-2 py-2.5 text-center text-slate-400">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="h-5 w-5 p-0 text-slate-400 hover:text-slate-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRowExpand(p.id);
                        }}
                        aria-label={isExpanded ? "Collapse row details" : "Expand row details"}
                      >
                        {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                      </Button>
                    </TableCell>

                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="size-6 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                          {p.employee.firstName.charAt(0)}{p.employee.lastName.charAt(0)}
                        </div>
                        <div>
                          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                            {p.employee.lastName}, {p.employee.firstName}
                          </span>{" "}
                          <span className="font-mono text-[11px] text-slate-400 font-normal">
                            ({p.employee.employeeNumber})
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {showAttendanceColumns && (
                      <>
                        {/* Overtime Column */}
                        <TableCell className="text-right py-2.5">
                          {overtimeAmount > 0 ? (
                            <div className="flex flex-col items-end">
                              <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                +₱{overtimeAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              {overtimeHours > 0 && (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {overtimeHours.toFixed(2)}h OT
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="font-mono text-xs text-slate-300 dark:text-slate-600 select-none">
                              —
                            </span>
                          )}
                        </TableCell>

                        {/* Lates & Undertime Column */}
                        <TableCell className="text-right py-2.5">
                          {lateUndertimeAmount > 0 ? (
                            <div className="flex flex-col items-end">
                              <span className="font-mono text-xs font-semibold text-amber-700 dark:text-amber-400">
                                -₱{lateUndertimeAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              {lateUndertimeMinutes > 0 && (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {lateUndertimeMinutes} {lateUndertimeMinutes === 1 ? "min" : "mins"}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="font-mono text-xs text-slate-300 dark:text-slate-600 select-none">
                              —
                            </span>
                          )}
                        </TableCell>
                      </>
                    )}

                    {/* Gross Pay */}
                    <TableCell className="text-right font-mono tabular-nums text-xs font-medium text-slate-800 dark:text-slate-200">
                      ₱{Number(p.grossPay).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>

                    {/* Statutory Deductions */}
                    <TableCell className="text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400">
                      ₱{Number(p.totalStatutoryDeductions).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>

                    {/* Loans & Other */}
                    <TableCell className="text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400">
                      ₱{Number(p.totalOtherDeductions).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>

                    {/* Net Pay */}
                    <TableCell className="text-right font-mono tabular-nums font-bold text-xs text-slate-900 dark:text-slate-100">
                      ₱{Number(p.netPay).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>

                    {/* Payslip Detail Action */}
                    <TableCell className="text-right py-1 pr-4" onClick={(e) => e.stopPropagation()}>
                      <PayslipDetailDialog
                        payslipId={p.id}
                        employeeName={employeeName}
                        netPay={p.netPay.toString()}
                        lineItems={p.lineItems.map((li) => ({
                          id: li.id,
                          category: li.category,
                          direction: li.direction,
                          description: li.description,
                          amount: li.amount.toString(),
                        }))}
                      />
                    </TableCell>
                  </TableRow>

                  {/* Expanded Itemized Drawer Sub-Row */}
                  {isExpanded && (
                    <TableRow className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                      <TableCell colSpan={colSpanCount} className="p-3 pl-10 pr-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                          {/* 1. Basic & Earnings */}
                          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-background p-2.5 space-y-1.5 shadow-2xs">
                            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] flex items-center justify-between">
                              <span>Earnings &amp; Basic</span>
                            </span>
                            <div className="space-y-1 pt-0.5">
                              {p.lineItems
                                .filter((li) => li.direction === "EARNING")
                                .map((li) => (
                                  <div key={li.id} className="flex justify-between items-center text-[11px]">
                                    <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px]" title={li.description}>
                                      {li.description}
                                      {li.category === "OVERTIME" && li.quantity ? ` (${Number(li.quantity).toFixed(2)}h)` : ""}
                                    </span>
                                    <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                                      ₱{Number(li.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                ))}
                              <div className="border-t pt-1 flex justify-between items-center font-bold text-xs text-slate-900 dark:text-slate-100">
                                <span>Gross Total</span>
                                <span className="font-mono">₱{Number(p.grossPay).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </div>

                          {/* 2. Attendance Impact Audit */}
                          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-background p-2.5 space-y-1.5 shadow-2xs">
                            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                              Attendance Audit
                            </span>
                            <div className="space-y-1 pt-0.5 text-[11px]">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-600 dark:text-slate-400">Overtime Approved</span>
                                <span className={`font-mono font-medium ${overtimeAmount > 0 ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
                                  {overtimeAmount > 0 ? `+₱${overtimeAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "None"}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-600 dark:text-slate-400">Late / Undertime</span>
                                <span className={`font-mono font-medium ${lateUndertimeAmount > 0 ? "text-amber-700 font-bold" : "text-slate-400"}`}>
                                  {lateUndertimeAmount > 0
                                    ? `-₱${lateUndertimeAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}${lateUndertimeMinutes > 0 ? ` (${lateUndertimeMinutes} mins)` : ""}`
                                    : "None / Waived"}
                                </span>
                              </div>
                              {absenceAmount > 0 && (
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-600 dark:text-slate-400">Absences</span>
                                  <span className="font-mono font-medium text-rose-600">
                                    -₱{absenceAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                              <div className="border-t pt-1 text-[10px] text-muted-foreground">
                                {overtimeAmount > 0 || lateUndertimeAmount > 0 ? (
                                  <span className="text-emerald-700 dark:text-emerald-400">✓ Attendance hours reflected in gross</span>
                                ) : (
                                  <span>Clean attendance or waived tardiness</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 3. Statutory Deductions */}
                          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-background p-2.5 space-y-1.5 shadow-2xs">
                            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                              Statutory Deductions
                            </span>
                            <div className="space-y-1 pt-0.5 text-[11px]">
                              {p.lineItems
                                .filter((li) => li.direction === "DEDUCTION" && (li.category.includes("SSS") || li.category.includes("PHILHEALTH") || li.category.includes("PAGIBIG") || li.category.includes("TAX")))
                                .map((li) => (
                                  <div key={li.id} className="flex justify-between items-center">
                                    <span className="text-slate-600 dark:text-slate-400 truncate max-w-[130px]">{li.description}</span>
                                    <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                                      ₱{Number(li.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                ))}
                              <div className="border-t pt-1 flex justify-between items-center font-bold text-xs text-slate-900 dark:text-slate-100">
                                <span>Statutory Total</span>
                                <span className="font-mono">₱{Number(p.totalStatutoryDeductions).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </div>

                          {/* 4. Loans & Final Take-Home */}
                          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-background p-2.5 space-y-1.5 shadow-2xs">
                            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                              Loans &amp; Net Take-Home
                            </span>
                            <div className="space-y-1 pt-0.5 text-[11px]">
                              {p.lineItems
                                .filter((li) => li.category === "LOAN_DEDUCTION" || li.category === "CASH_ADVANCE")
                                .map((li) => (
                                  <div key={li.id} className="flex justify-between items-center">
                                    <span className="text-slate-600 dark:text-slate-400 truncate max-w-[130px]">{li.description}</span>
                                    <span className="font-mono font-medium text-rose-600">
                                      -₱{Number(li.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                ))}
                              {p.lineItems.filter((li) => li.category === "LOAN_DEDUCTION" || li.category === "CASH_ADVANCE").length === 0 && (
                                <div className="text-slate-400 text-[10px]">No active loan deductions</div>
                              )}
                              <div className="border-t pt-1 flex justify-between items-center font-bold text-xs text-blue-700 dark:text-blue-400">
                                <span>Net Payout</span>
                                <span className="font-mono text-sm">₱{Number(p.netPay).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>

          {/* Table Footer Totals */}
          <TableFooter>
            <TableRow className="bg-slate-50/90 dark:bg-slate-900/90 font-bold border-t-2 border-slate-200/90 dark:border-slate-800">
              <TableCell className="w-8 px-2" />
              <TableCell className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Total Register ({filteredPayslips.length} Employees)
              </TableCell>

              {showAttendanceColumns && (
                <>
                  <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    {totals.overtime > 0
                      ? `+₱${totals.overtime.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                      : "₱0.00"}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-amber-700 dark:text-amber-400">
                    {totals.lateUndertime > 0
                      ? `-₱${totals.lateUndertime.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                      : "₱0.00"}
                  </TableCell>
                </>
              )}

              <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-slate-900 dark:text-slate-100">
                ₱{totals.gross.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-slate-900 dark:text-slate-100">
                ₱{totals.statutory.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-slate-900 dark:text-slate-100">
                ₱{totals.other.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-xs font-bold text-blue-700 dark:text-blue-400">
                ₱{totals.net.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-right pr-4" />
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
