"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricCard } from "@/components/ui/metric-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Building2Icon,
  UsersIcon,
  BanknoteIcon,
  ArrowRightLeftIcon,
  FileSpreadsheetIcon,
  DownloadIcon,
  FilterIcon,
  CheckSquareIcon,
  SquareIcon,
  SlidersHorizontalIcon,
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

interface CompanyOption {
  id: string;
  legalName: string;
  tradeName: string | null;
  companyCode: string;
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

interface FilterSummary {
  includedCompanies: string;
  payrollRunLabel: string;
  statusFilterLabel: string;
}

export function CompanyPayoutReport() {
  const [runOptions, setRunOptions] = useState<RunOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("ALL");
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [reportData, setReportData] = useState<CompanyReportItem[]>([]);
  const [groupTotals, setGroupTotals] = useState<GroupTotals>({ totalInternalNet: 0, totalIntercompanyNet: 0, grandTotalNet: 0 });
  const [filterSummary, setFilterSummary] = useState<FilterSummary>({
    includedCompanies: "All Companies",
    payrollRunLabel: "All Payroll Runs",
    statusFilterLabel: "Drafts, Pending, Approved & Posted",
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);

  // Modal Dialog Filter State
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [tempRunId, setTempRunId] = useState<string>("ALL");
  const [tempCompanyIds, setTempCompanyIds] = useState<string[]>([]);

  async function fetchReport(runId: string, companyIdsList: string[]) {
    setLoading(true);
    try {
      const companyParam = companyIdsList.length > 0 ? companyIdsList.join(",") : "ALL";
      const url = `/api/admin/special-reports/company-payout?runId=${encodeURIComponent(runId)}&companyIds=${encodeURIComponent(companyParam)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRunOptions(data.runOptions || []);
        setCompanies(data.companies || []);
        setSelectedRunId(data.selectedRunId || "ALL");
        setReportData(data.reportData || []);
        setGroupTotals(data.groupTotals || { totalInternalNet: 0, totalIntercompanyNet: 0, grandTotalNet: 0 });
        if (data.filterSummary) {
          setFilterSummary(data.filterSummary);
        }

        // If selectedCompanyIds is empty on initial load, set to all retrieved companies
        if (selectedCompanyIds.length === 0 && data.companies && data.companies.length > 0) {
          const allIds = data.companies.map((c: CompanyOption) => c.id);
          setSelectedCompanyIds(allIds);
        }
      }
    } catch (err) {
      console.error("Failed to load company payout report", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReport("ALL", []);
  }, []);

  function handleOpenFilterModal() {
    setTempRunId(selectedRunId);
    setTempCompanyIds(
      selectedCompanyIds.length > 0 ? selectedCompanyIds : companies.map((c) => c.id)
    );
    setDialogOpen(true);
  }

  function handleSelectAllCompanies() {
    setTempCompanyIds(companies.map((c) => c.id));
  }

  function handleClearAllCompanies() {
    setTempCompanyIds([]);
  }

  function handleToggleCompany(id: string) {
    if (tempCompanyIds.includes(id)) {
      setTempCompanyIds(tempCompanyIds.filter((item) => item !== id));
    } else {
      setTempCompanyIds([...tempCompanyIds, id]);
    }
  }

  function handleApplyFilters() {
    setSelectedRunId(tempRunId);
    setSelectedCompanyIds(tempCompanyIds);
    setDialogOpen(false);
    fetchReport(tempRunId, tempCompanyIds);
  }

  function handleDownloadPdf() {
    setDownloadingPdf(true);
    const companyParam = selectedCompanyIds.length > 0 ? selectedCompanyIds.join(",") : "ALL";
    const pdfUrl = `/api/admin/special-reports/company-payout/pdf?runId=${encodeURIComponent(selectedRunId)}&companyIds=${encodeURIComponent(companyParam)}`;
    window.open(pdfUrl, "_blank");
    setTimeout(() => setDownloadingPdf(false), 1500);
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge className="bg-amber-950/60 text-amber-400 border-amber-800 text-[10px] px-1.5 py-0.5">DRAFT</Badge>;
      case "PENDING_APPROVAL":
        return <Badge className="bg-blue-950/60 text-blue-400 border-blue-800 text-[10px] px-1.5 py-0.5">PENDING</Badge>;
      case "APPROVED":
        return <Badge className="bg-emerald-950/60 text-emerald-400 border-emerald-800 text-[10px] px-1.5 py-0.5">APPROVED</Badge>;
      case "POSTED":
        return <Badge className="bg-purple-950/60 text-purple-400 border-purple-800 text-[10px] px-1.5 py-0.5">POSTED</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Control Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileSpreadsheetIcon className="size-5 text-blue-400" />
            Company Payout Special Report
          </h2>
          <p className="text-xs text-slate-400">
            Cross-company multi-tenant payout analytics including Draft, Pending, Approved &amp; Posted runs. Internal vs Intercompany net payouts breakdown.
          </p>
        </div>

        {/* Modal Filter Trigger & PDF Download Action */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenFilterModal}
            className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 text-xs font-semibold gap-1.5"
          >
            <SlidersHorizontalIcon className="size-3.5 text-blue-400" />
            Filter &amp; Configure Report
          </Button>

          <Button
            variant="default"
            size="sm"
            disabled={downloadingPdf || loading}
            onClick={handleDownloadPdf}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold gap-1.5"
          >
            <DownloadIcon className="size-3.5" />
            {downloadingPdf ? "Generating PDF..." : "Download PDF"}
          </Button>
        </div>
      </div>

      {/* Filter Summary Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
          <FilterIcon className="size-3.5 text-slate-400" />
          Active Filters:
        </div>
        <Badge variant="outline" className="border-slate-700 bg-slate-800/80 text-slate-200 text-[11px] font-medium py-0.5">
          <span className="text-slate-400 mr-1">Companies:</span> {filterSummary.includedCompanies}
        </Badge>
        <Badge variant="outline" className="border-slate-700 bg-slate-800/80 text-slate-200 text-[11px] font-medium py-0.5">
          <span className="text-slate-400 mr-1">Payroll Run:</span> {filterSummary.payrollRunLabel}
        </Badge>
        <Badge variant="outline" className="border-blue-900/60 bg-blue-950/40 text-blue-300 text-[11px] font-medium py-0.5">
          Status: Draft, Pending, Approved &amp; Posted
        </Badge>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Group Net Payout"
          value={`₱${groupTotals.grandTotalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          subtitle="Net payouts across selected companies"
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
          title="Selected Companies"
          value={reportData.length}
          subtitle="Filtered company entities"
          icon={Building2Icon}
        />
      </div>

      {/* Company Breakdown List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading multi-company payout report data...</div>
      ) : reportData.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500">No company payout records found for the selected company and run filters.</div>
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
                        No internal payouts recorded for this company in the selected run filter.
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
                        No intercompany payouts funded by this company in the selected run filter.
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

      {/* Filter & Configuration Dialogue Box Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl bg-slate-900 border-slate-800 text-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <SlidersHorizontalIcon className="size-5 text-blue-400" />
              Configure Company Payout Report
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Select which companies to include and choose the payroll run filter (includes Drafts, Pending Approval, Approved &amp; Posted runs).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* 1. Companies Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  1. Included Companies ({tempCompanyIds.length} of {companies.length} selected)
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={handleSelectAllCompanies}
                    className="text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-800 h-6 px-2"
                  >
                    Select All
                  </Button>
                  <span className="text-slate-600 text-xs">|</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={handleClearAllCompanies}
                    className="text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 h-6 px-2"
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                {companies.map((comp) => {
                  const isChecked = tempCompanyIds.includes(comp.id);
                  return (
                    <div
                      key={comp.id}
                      onClick={() => handleToggleCompany(comp.id)}
                      className="flex items-center space-x-3 cursor-pointer p-1.5 rounded hover:bg-slate-800/60 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by parent click
                        className="size-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 accent-blue-600"
                      />
                      <div className="text-xs">
                        <span className="font-semibold text-white">{comp.legalName}</span>
                        <span className="ml-2 font-mono text-slate-400 text-[11px]">({comp.companyCode})</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Payroll Run Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                2. Payroll Run Filter
              </label>
              <select
                value={tempRunId}
                onChange={(e) => setTempRunId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Payroll Runs (Drafts, Pending, Approved &amp; Posted)</option>
                {runOptions.map((run) => (
                  <option key={run.runId} value={run.runId}>
                    {run.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">
                You can select all runs or isolate a specific payroll run across Drafts, Pending Approval, Approved, and Posted statuses.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={tempCompanyIds.length === 0}
              onClick={handleApplyFilters}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
            >
              Apply &amp; Generate Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
