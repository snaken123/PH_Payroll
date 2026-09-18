"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricCard } from "@/components/ui/metric-card";
import {
  Building2Icon,
  UsersIcon,
  BanknoteIcon,
  ArrowRightLeftIcon,
  FileSpreadsheetIcon,
  CheckCircle2Icon,
  DownloadIcon,
  FilterIcon,
} from "lucide-react";

interface RunOption {
  runId: string;
  companyId: string;
  companyName: string;
  companyCode: string;
  runNumber: number;
  status: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  label: string;
}

interface InternalPayout {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  positionTitle: string;
  grossPay: number;
  statutoryDeductions: number;
  otherDeductions: number;
  netPay: number;
  runLabel: string;
}

interface IntercompanyPayout {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  primaryCompany: string;
  itemLabel: string;
  grossAmount: number;
  netPay: number;
  runLabel: string;
}

interface CompanyReportItem {
  companyId: string;
  companyName: string;
  companyCode: string;
  internalPayouts: InternalPayout[];
  intercompanyPayouts: IntercompanyPayout[];
  totalInternalNet: number;
  totalIntercompanyNet: number;
  grandTotalNet: number;
}

interface GroupTotals {
  totalInternalNet: number;
  totalIntercompanyNet: number;
  grandTotalNet: number;
}

export function CompanyPayoutReport() {
  const [runOptions, setRunOptions] = useState<RunOption[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("ALL");
  const [reportData, setReportData] = useState<CompanyReportItem[]>([]);
  const [groupTotals, setGroupTotals] = useState<GroupTotals>({ totalInternalNet: 0, totalIntercompanyNet: 0, grandTotalNet: 0 });
  const [loading, setLoading] = useState<boolean>(true);

  async function fetchReport(runId: string) {
    setLoading(true);
    try {
      const url = `/api/admin/special-reports/company-payout?runId=${encodeURIComponent(runId)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRunOptions(data.runOptions || []);
        setSelectedRunId(data.selectedRunId || "ALL");
        setReportData(data.reportData || []);
        setGroupTotals(data.groupTotals || { totalInternalNet: 0, totalIntercompanyNet: 0, grandTotalNet: 0 });
      }
    } catch (err) {
      console.error("Failed to load company payout report", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReport("ALL");
  }, []);

  function handleRunChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setSelectedRunId(val);
    fetchReport(val);
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileSpreadsheetIcon className="size-5 text-blue-400" />
            Company Payout Special Report
          </h2>
          <p className="text-xs text-slate-400">
            Cross-company multi-tenant payout analytics. Understand total net payouts per company broken down into Internal and Intercompany allocations.
          </p>
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-2">
          <FilterIcon className="size-4 text-slate-400" />
          <select
            value={selectedRunId}
            onChange={handleRunChange}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Approved/Posted Payroll Runs</option>
            {runOptions.map((run) => (
              <option key={run.runId} value={run.runId}>
                {run.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Group Net Payout"
          value={`₱${groupTotals.grandTotalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          subtitle="Net payouts across all companies"
          icon={BanknoteIcon}
        />
        <MetricCard
          title="Internal Payouts"
          value={`₱${groupTotals.totalInternalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          subtitle="Primary employee net payouts"
          icon={UsersIcon}
        />
        <MetricCard
          title="Intercompany Payouts"
          value={`₱${groupTotals.totalIntercompanyNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          subtitle="Cross-company funded payouts"
          icon={ArrowRightLeftIcon}
        />
        <MetricCard
          title="Group Companies"
          value={reportData.length}
          subtitle="Registered company entities"
          icon={Building2Icon}
        />
      </div>

      {/* Company Breakdown List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading multi-company payout report...</div>
      ) : reportData.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500">No company payout records found for the selected run filter.</div>
      ) : (
        <div className="space-y-6">
          {reportData.map((companyReport) => (
            <Card key={companyReport.companyId} className="border-slate-800 bg-slate-900/90 shadow-md">
              <CardHeader className="border-b border-slate-800 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                    <Building2Icon className="size-4 text-blue-400" />
                    {companyReport.companyName}
                    <span className="text-xs font-mono font-medium text-slate-400">({companyReport.companyCode})</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Grand Total Payout: <strong className="text-emerald-400 font-mono">₱{companyReport.grandTotalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-300 font-mono text-[11px]">
                    Internal: ₱{companyReport.totalInternalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </Badge>
                  <Badge variant="outline" className="border-blue-900/60 bg-blue-950/40 text-blue-300 font-mono text-[11px]">
                    Intercompany: ₱{companyReport.totalIntercompanyNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <Tabs defaultValue="internal" className="w-full">
                  <TabsList className="bg-slate-800 border border-slate-700">
                    <TabsTrigger value="internal" className="text-xs font-semibold gap-1.5">
                      <UsersIcon className="size-3.5 text-emerald-400" />
                      Internal Payouts ({companyReport.internalPayouts.length})
                    </TabsTrigger>
                    <TabsTrigger value="intercompany" className="text-xs font-semibold gap-1.5">
                      <ArrowRightLeftIcon className="size-3.5 text-blue-400" />
                      Intercompany Payouts ({companyReport.intercompanyPayouts.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Internal Payouts Tab */}
                  <TabsContent value="internal" className="pt-3">
                    <div className="mb-2 text-xs text-slate-400">
                      Payouts for employees whose primary employer is <strong>{companyReport.companyName}</strong>, net of applicable deductions.
                    </div>
                    {companyReport.internalPayouts.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500 border border-slate-800 rounded-lg bg-slate-950/40">
                        No internal payouts recorded for this company in the selected run.
                      </div>
                    ) : (
                      <div className="rounded-lg border border-slate-800 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-800/80 hover:bg-slate-800/80 border-b border-slate-800">
                              <TableHead className="text-xs font-bold text-slate-300">Emp #</TableHead>
                              <TableHead className="text-xs font-bold text-slate-300">Employee Name</TableHead>
                              <TableHead className="text-xs font-bold text-slate-300">Position</TableHead>
                              <TableHead className="text-right text-xs font-bold text-slate-300">Gross Pay</TableHead>
                              <TableHead className="text-right text-xs font-bold text-slate-300">Statutory Deductions</TableHead>
                              <TableHead className="text-right text-xs font-bold text-slate-300">Other Deductions</TableHead>
                              <TableHead className="text-right text-xs font-bold text-emerald-400">Net Payout</TableHead>
                              <TableHead className="text-xs font-bold text-slate-300">Payroll Run</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {companyReport.internalPayouts.map((emp, idx) => (
                              <TableRow key={`${emp.employeeId}-${idx}`} className="hover:bg-slate-800/40 border-b border-slate-800/60">
                                <TableCell className="font-mono text-xs text-slate-400">{emp.employeeNumber}</TableCell>
                                <TableCell className="font-bold text-xs text-white">{emp.employeeName}</TableCell>
                                <TableCell className="text-xs text-slate-300">{emp.positionTitle}</TableCell>
                                <TableCell className="text-right font-mono text-xs text-slate-200">₱{emp.grossPay.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                                <TableCell className="text-right font-mono text-xs text-rose-400">₱{emp.statutoryDeductions.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                                <TableCell className="text-right font-mono text-xs text-amber-400">₱{emp.otherDeductions.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                                <TableCell className="text-right font-mono text-xs font-bold text-emerald-400">₱{emp.netPay.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                                <TableCell className="text-xs text-slate-400 font-mono">{emp.runLabel}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>

                  {/* Intercompany Payouts Tab */}
                  <TabsContent value="intercompany" className="pt-3">
                    <div className="mb-2 text-xs text-slate-400">
                      Payouts &amp; allowances for employees outside <strong>{companyReport.companyName}</strong> that are funded/paid by <strong>{companyReport.companyName}</strong>.
                    </div>
                    {companyReport.intercompanyPayouts.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500 border border-slate-800 rounded-lg bg-slate-950/40">
                        No intercompany payouts funded by this company in the selected run.
                      </div>
                    ) : (
                      <div className="rounded-lg border border-slate-800 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-800/80 hover:bg-slate-800/80 border-b border-slate-800">
                              <TableHead className="text-xs font-bold text-slate-300">Emp #</TableHead>
                              <TableHead className="text-xs font-bold text-slate-300">Employee Name</TableHead>
                              <TableHead className="text-xs font-bold text-slate-300">Primary Employer</TableHead>
                              <TableHead className="text-xs font-bold text-slate-300">Allowance / Item</TableHead>
                              <TableHead className="text-right text-xs font-bold text-slate-300">Gross Amount</TableHead>
                              <TableHead className="text-right text-xs font-bold text-blue-400">Intercompany Net Payout</TableHead>
                              <TableHead className="text-xs font-bold text-slate-300">Payroll Run</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {companyReport.intercompanyPayouts.map((emp, idx) => (
                              <TableRow key={`${emp.employeeId}-${idx}`} className="hover:bg-slate-800/40 border-b border-slate-800/60">
                                <TableCell className="font-mono text-xs text-slate-400">{emp.employeeNumber}</TableCell>
                                <TableCell className="font-bold text-xs text-white">{emp.employeeName}</TableCell>
                                <TableCell className="text-xs text-slate-300">{emp.primaryCompany}</TableCell>
                                <TableCell className="text-xs text-blue-300 font-medium">{emp.itemLabel}</TableCell>
                                <TableCell className="text-right font-mono text-xs text-slate-200">₱{emp.grossAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                                <TableCell className="text-right font-mono text-xs font-bold text-blue-400">₱{emp.netPay.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                                <TableCell className="text-xs text-slate-400 font-mono">{emp.runLabel}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
