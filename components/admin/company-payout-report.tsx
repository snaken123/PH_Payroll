"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Building2Icon,
  UsersIcon,
  BanknoteIcon,
  ArrowRightLeftIcon,
  FileSpreadsheetIcon,
  DownloadIcon,
  FilterIcon,
  SlidersHorizontalIcon,
  SearchIcon,
  CheckSquareIcon,
  SquareIcon,
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

interface EmployeeOption {
  id: string;
  employeeNumber: string;
  name: string;
  companyId: string;
  companyCode: string;
  companyName: string;
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

interface ConsolidatedEmployee {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  companyName: string;
  bankName: string;
  bankAccountNumber: string;
  netAmount: number;
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
  includedEmployees: string;
  payrollRunLabel: string;
  statusFilterLabel: string;
}

export function CompanyPayoutReport() {
  const [runOptions, setRunOptions] = useState<RunOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  const [selectedRunIds, setSelectedRunIds] = useState<string[]>(["ALL"]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  const [reportData, setReportData] = useState<CompanyReportItem[]>([]);
  const [consolidatedEmployees, setConsolidatedEmployees] = useState<ConsolidatedEmployee[]>([]);
  const [groupTotals, setGroupTotals] = useState<GroupTotals>({ totalInternalNet: 0, totalIntercompanyNet: 0, grandTotalNet: 0 });
  const [filterSummary, setFilterSummary] = useState<FilterSummary>({
    includedCompanies: "All Companies",
    includedEmployees: "All Employees",
    payrollRunLabel: "All Payroll Runs",
    statusFilterLabel: "Drafts, Pending, Approved & Posted",
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);

  // Modal Dialog Filter State
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [tempRunIds, setTempRunIds] = useState<string[]>(["ALL"]);
  const [tempCompanyIds, setTempCompanyIds] = useState<string[]>([]);
  const [tempEmployeeIds, setTempEmployeeIds] = useState<string[]>([]);
  const [employeeSearchFilter, setEmployeeSearchFilter] = useState<string>("");
  const [runSearchFilter, setRunSearchFilter] = useState<string>("");

  function serializeParam(items: string[]): string {
    if (items.length === 0 || items.includes("ALL")) return "ALL";
    return items.join(",");
  }

  async function fetchReport(runIdsList: string[], companyIdsList: string[], employeeIdsList: string[]) {
    setLoading(true);
    try {
      const runParam = serializeParam(runIdsList);
      const companyParam = companyIdsList.length > 0 ? companyIdsList.join(",") : "ALL";
      const employeeParam = employeeIdsList.length > 0 ? employeeIdsList.join(",") : "ALL";
      const url = `/api/admin/special-reports/company-payout?runId=${encodeURIComponent(runParam)}&companyIds=${encodeURIComponent(companyParam)}&employeeIds=${encodeURIComponent(employeeParam)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRunOptions(data.runOptions || []);
        setCompanies(data.companies || []);
        setEmployees(data.employees || []);
        setReportData(data.reportData || []);
        setConsolidatedEmployees(data.consolidatedEmployees || []);
        setGroupTotals(data.groupTotals || { totalInternalNet: 0, totalIntercompanyNet: 0, grandTotalNet: 0 });
        if (data.filterSummary) {
          setFilterSummary(data.filterSummary);
        }

        // Initialize selections if empty
        if (selectedCompanyIds.length === 0 && data.companies && data.companies.length > 0) {
          setSelectedCompanyIds(data.companies.map((c: CompanyOption) => c.id));
        }
        if (selectedEmployeeIds.length === 0 && data.employees && data.employees.length > 0) {
          setSelectedEmployeeIds(data.employees.map((e: EmployeeOption) => e.id));
        }
      }
    } catch (err) {
      console.error("Failed to load company payout report", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReport(["ALL"], [], []);
  }, []);

  function handleOpenFilterModal() {
    setTempRunIds(selectedRunIds.length > 0 ? selectedRunIds : ["ALL"]);
    setTempCompanyIds(
      selectedCompanyIds.length > 0 ? selectedCompanyIds : companies.map((c) => c.id)
    );
    setTempEmployeeIds(
      selectedEmployeeIds.length > 0 ? selectedEmployeeIds : employees.map((e) => e.id)
    );
    setEmployeeSearchFilter("");
    setRunSearchFilter("");
    setDialogOpen(true);
  }

  const availableEmployees = useMemo(() => {
    if (tempCompanyIds.length === 0) return [];
    return employees.filter((e) => tempCompanyIds.includes(e.companyId));
  }, [employees, tempCompanyIds]);

  const filteredEmployeesForModal = useMemo(() => {
    if (!employeeSearchFilter.trim()) return availableEmployees;
    const q = employeeSearchFilter.trim().toLowerCase();
    return availableEmployees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.employeeNumber.toLowerCase().includes(q) ||
        e.companyCode.toLowerCase().includes(q) ||
        e.companyName.toLowerCase().includes(q)
    );
  }, [availableEmployees, employeeSearchFilter]);

  const availableRuns = useMemo(() => {
    if (tempCompanyIds.length === 0) return [];
    return runOptions.filter((r) => tempCompanyIds.includes(r.companyId));
  }, [runOptions, tempCompanyIds]);

  const filteredRunsForModal = useMemo(() => {
    if (!runSearchFilter.trim()) return availableRuns;
    const q = runSearchFilter.trim().toLowerCase();
    return availableRuns.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.companyName.toLowerCase().includes(q) ||
        r.companyCode.toLowerCase().includes(q)
    );
  }, [availableRuns, runSearchFilter]);

  function handleSelectAllRuns() {
    const availIds = availableRuns.map((r) => r.runId);
    if (availIds.length === runOptions.length && runOptions.length > 0) {
      setTempRunIds(["ALL"]);
    } else {
      setTempRunIds(Array.from(new Set([...tempRunIds.filter((id) => id !== "ALL"), ...availIds])));
    }
  }

  function handleClearAllRuns() {
    const availIds = new Set(availableRuns.map((r) => r.runId));
    if (tempRunIds.includes("ALL")) {
      const remainingRuns = runOptions.filter((r) => !availIds.has(r.runId)).map((r) => r.runId);
      setTempRunIds(remainingRuns);
    } else {
      setTempRunIds(tempRunIds.filter((id) => !availIds.has(id)));
    }
  }

  function handleSelectAllEmployees() {
    const availIds = availableEmployees.map((e) => e.id);
    setTempEmployeeIds(Array.from(new Set([...tempEmployeeIds, ...availIds])));
  }

  function handleClearAllEmployees() {
    const availIds = new Set(availableEmployees.map((e) => e.id));
    setTempEmployeeIds(tempEmployeeIds.filter((id) => !availIds.has(id)));
  }

  function handleToggleRun(runId: string) {
    let current = tempRunIds;
    if (current.includes("ALL")) {
      current = runOptions.map((r) => r.runId);
    }

    if (current.includes(runId)) {
      setTempRunIds(current.filter((id) => id !== runId));
    } else {
      const next = [...current, runId];
      if (next.length === runOptions.length && runOptions.length > 0) {
        setTempRunIds(["ALL"]);
      } else {
        setTempRunIds(next);
      }
    }
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

  function handleToggleEmployee(id: string) {
    if (tempEmployeeIds.includes(id)) {
      setTempEmployeeIds(tempEmployeeIds.filter((item) => item !== id));
    } else {
      setTempEmployeeIds([...tempEmployeeIds, id]);
    }
  }

  // Interactive on-screen toggle for individual employee payouts
  function handleOnScreenToggleEmployee(empId: string) {
    let nextEmployeeIds: string[];
    if (selectedEmployeeIds.includes(empId)) {
      nextEmployeeIds = selectedEmployeeIds.filter((id) => id !== empId);
    } else {
      nextEmployeeIds = [...selectedEmployeeIds, empId];
    }
    setSelectedEmployeeIds(nextEmployeeIds);
    fetchReport(selectedRunIds, selectedCompanyIds, nextEmployeeIds);
  }

  // Interactive on-screen toggle for company-level internal/intercompany payouts
  function handleToggleAllCompanyInternal(companyReport: CompanyReportItem, select: boolean) {
    const companyEmpIds = new Set(companyReport.internalPayouts.map((i) => i.employeeId));
    let nextEmployeeIds: string[];
    if (select) {
      nextEmployeeIds = Array.from(new Set([...selectedEmployeeIds, ...companyEmpIds]));
    } else {
      nextEmployeeIds = selectedEmployeeIds.filter((id) => !companyEmpIds.has(id));
    }
    setSelectedEmployeeIds(nextEmployeeIds);
    fetchReport(selectedRunIds, selectedCompanyIds, nextEmployeeIds);
  }

  function handleToggleAllCompanyIntercompany(companyReport: CompanyReportItem, select: boolean) {
    const companyEmpIds = new Set(companyReport.intercompanyPayouts.map((i) => i.employeeId));
    let nextEmployeeIds: string[];
    if (select) {
      nextEmployeeIds = Array.from(new Set([...selectedEmployeeIds, ...companyEmpIds]));
    } else {
      nextEmployeeIds = selectedEmployeeIds.filter((id) => !companyEmpIds.has(id));
    }
    setSelectedEmployeeIds(nextEmployeeIds);
    fetchReport(selectedRunIds, selectedCompanyIds, nextEmployeeIds);
  }

  function handleApplyFilters() {
    const finalRunIds = tempRunIds.length === 0 ? ["ALL"] : tempRunIds;
    const finalCompanyIds = tempCompanyIds.length === 0 ? companies.map((c) => c.id) : tempCompanyIds;
    const finalEmployeeIds = tempEmployeeIds.length === 0 ? employees.map((e) => e.id) : tempEmployeeIds;

    setSelectedRunIds(finalRunIds);
    setSelectedCompanyIds(finalCompanyIds);
    setSelectedEmployeeIds(finalEmployeeIds);
    setDialogOpen(false);
    fetchReport(finalRunIds, finalCompanyIds, finalEmployeeIds);
  }

  function handleDownloadPdf() {
    setDownloadingPdf(true);
    const runParam = serializeParam(selectedRunIds);
    const companyParam = selectedCompanyIds.length > 0 ? selectedCompanyIds.join(",") : "ALL";
    const employeeParam = selectedEmployeeIds.length > 0 ? selectedEmployeeIds.join(",") : "ALL";
    const pdfUrl = `/api/admin/special-reports/company-payout/pdf?runId=${encodeURIComponent(runParam)}&companyIds=${encodeURIComponent(companyParam)}&employeeIds=${encodeURIComponent(employeeParam)}`;
    window.open(pdfUrl, "_blank");
    setTimeout(() => setDownloadingPdf(false), 1500);
  }

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
          <span className="text-slate-400 mr-1">Employees:</span> {filterSummary.includedEmployees}
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
          subtitle="Net payouts for selected employees &amp; companies"
          icon={BanknoteIcon}
        />
        <MetricCard
          title="Internal Payouts"
          value={`₱${groupTotals.totalInternalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          subtitle="Selected primary employee payouts"
          icon={UsersIcon}
        />
        <MetricCard
          title="Intercompany Payouts"
          value={`₱${groupTotals.totalIntercompanyNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          subtitle="Selected cross-company payouts"
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
        <div className="py-12 text-center text-xs text-slate-500">No company payout records found for the selected company, employee, and run filters.</div>
      ) : (
        <div className="space-y-6">
          {/* Company Net Outlay Summary Table */}
          <Card className="border-slate-800 bg-slate-900/90 shadow-md">
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Building2Icon className="size-4 text-blue-400" />
                Company Net Outlay Summary
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Summary of internal and intercompany net payouts per entity. The total net outlay matches the Total Group Net Payout.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-950/60">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-xs font-bold text-slate-300">Company Entity</TableHead>
                    <TableHead className="text-xs font-bold text-slate-300 text-right">Internal Net Payout</TableHead>
                    <TableHead className="text-xs font-bold text-slate-300 text-right">Intercompany Net Payout</TableHead>
                    <TableHead className="text-xs font-bold text-slate-300 text-right">Total Net Outlay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((company) => (
                    <TableRow key={company.companyId} className="border-slate-800/60 hover:bg-slate-800/40">
                      <TableCell className="text-xs font-medium text-slate-200">
                        {company.companyName}{" "}
                        <span className="text-slate-400 font-mono">({company.companyCode})</span>
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono text-slate-300">
                        ₱{company.totalInternalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono text-blue-300">
                        ₱{company.totalIntercompanyNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono font-semibold text-emerald-400">
                        ₱{company.grandTotalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 border-slate-700 bg-slate-950/80 font-bold">
                    <TableCell className="text-xs font-bold text-white">
                      Total Group Net Outlay ({reportData.length} Companies)
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-bold text-slate-200">
                      ₱{groupTotals.totalInternalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-bold text-blue-300">
                      ₱{groupTotals.totalIntercompanyNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-bold text-emerald-400 text-sm">
                      ₱{groupTotals.grandTotalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {reportData.map((companyReport) => {
            const allInternalSelected = companyReport.internalPayouts.length > 0 &&
              companyReport.internalPayouts.every((i) => selectedEmployeeIds.includes(i.employeeId));
            const allIntercompanySelected = companyReport.intercompanyPayouts.length > 0 &&
              companyReport.intercompanyPayouts.every((i) => selectedEmployeeIds.includes(i.employeeId));

            return (
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
                      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                        <span>
                          Payouts for employees whose primary employer is <strong>{companyReport.companyName}</strong>, net of applicable deductions. Uncheck employees to exclude them from the report totals.
                        </span>
                        {companyReport.internalPayouts.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() => handleToggleAllCompanyInternal(companyReport, !allInternalSelected)}
                              className="text-xs text-blue-400 hover:text-blue-300 h-6 px-2"
                            >
                              {allInternalSelected ? "Deselect All Internal" : "Select All Internal"}
                            </Button>
                          </div>
                        )}
                      </div>
                      {companyReport.internalPayouts.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-500 border border-slate-800 rounded-lg bg-slate-950/40">
                          No internal payouts recorded for this company in the selected run/employee filter.
                        </div>
                      ) : (
                        <div className="rounded-lg border border-slate-800 overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-800/80 hover:bg-slate-800/80 border-b border-slate-800">
                                <TableHead className="w-10 text-center">
                                  <input
                                    type="checkbox"
                                    checked={allInternalSelected}
                                    onChange={(e) => handleToggleAllCompanyInternal(companyReport, e.target.checked)}
                                    aria-label="Toggle all internal payouts for this company"
                                    className="size-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                                  />
                                </TableHead>
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
                              {companyReport.internalPayouts.map((emp, idx) => {
                                const isChecked = selectedEmployeeIds.includes(emp.employeeId);
                                return (
                                  <TableRow
                                    key={`${emp.employeeId}-${idx}`}
                                    className={`hover:bg-slate-800/40 border-b border-slate-800/60 transition-colors ${
                                      !isChecked ? "opacity-50 bg-slate-950/40" : ""
                                    }`}
                                  >
                                    <TableCell className="text-center">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleOnScreenToggleEmployee(emp.employeeId)}
                                        aria-label={`Include ${emp.employeeName} in report`}
                                        className="size-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                                      />
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-slate-400">{emp.employeeNumber}</TableCell>
                                    <TableCell className="font-bold text-xs text-white">{emp.employeeName}</TableCell>
                                    <TableCell className="text-xs text-slate-300">{emp.positionTitle}</TableCell>
                                    <TableCell className="text-right font-mono text-xs text-slate-200">₱{emp.grossPay.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="text-right font-mono text-xs text-rose-400">₱{emp.statutoryDeductions.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="text-right font-mono text-xs text-amber-400">₱{emp.otherDeductions.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="text-right font-mono text-xs font-bold text-emerald-400">₱{emp.netPay.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="text-xs text-slate-400 font-mono">{emp.runLabel}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>

                    {/* Intercompany Payouts Tab */}
                    <TabsContent value="intercompany" className="pt-3">
                      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                        <span>
                          Payouts &amp; allowances for employees outside <strong>{companyReport.companyName}</strong> that are funded/paid by <strong>{companyReport.companyName}</strong>. Uncheck items to exclude from report totals.
                        </span>
                        {companyReport.intercompanyPayouts.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() => handleToggleAllCompanyIntercompany(companyReport, !allIntercompanySelected)}
                              className="text-xs text-blue-400 hover:text-blue-300 h-6 px-2"
                            >
                              {allIntercompanySelected ? "Deselect All Intercompany" : "Select All Intercompany"}
                            </Button>
                          </div>
                        )}
                      </div>
                      {companyReport.intercompanyPayouts.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-500 border border-slate-800 rounded-lg bg-slate-950/40">
                          No intercompany payouts funded by this company in the selected run/employee filter.
                        </div>
                      ) : (
                        <div className="rounded-lg border border-slate-800 overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-800/80 hover:bg-slate-800/80 border-b border-slate-800">
                                <TableHead className="w-10 text-center">
                                  <input
                                    type="checkbox"
                                    checked={allIntercompanySelected}
                                    onChange={(e) => handleToggleAllCompanyIntercompany(companyReport, e.target.checked)}
                                    aria-label="Toggle all intercompany payouts for this company"
                                    className="size-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                                  />
                                </TableHead>
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
                              {companyReport.intercompanyPayouts.map((emp, idx) => {
                                const isChecked = selectedEmployeeIds.includes(emp.employeeId);
                                return (
                                  <TableRow
                                    key={`${emp.employeeId}-${idx}`}
                                    className={`hover:bg-slate-800/40 border-b border-slate-800/60 transition-colors ${
                                      !isChecked ? "opacity-50 bg-slate-950/40" : ""
                                    }`}
                                  >
                                    <TableCell className="text-center">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleOnScreenToggleEmployee(emp.employeeId)}
                                        aria-label={`Include ${emp.employeeName} in report`}
                                        className="size-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                                      />
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-slate-400">{emp.employeeNumber}</TableCell>
                                    <TableCell className="font-bold text-xs text-white">{emp.employeeName}</TableCell>
                                    <TableCell className="text-xs text-slate-300">{emp.primaryCompany}</TableCell>
                                    <TableCell className="text-xs text-blue-300 font-medium">{emp.itemLabel}</TableCell>
                                    <TableCell className="text-right font-mono text-xs text-slate-200">₱{emp.grossAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="text-right font-mono text-xs font-bold text-blue-400">₱{emp.netPay.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="text-xs text-slate-400 font-mono">{emp.runLabel}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            );
          })}

          {/* Consolidated Group-Wide Employee Payout List */}
          {consolidatedEmployees.length > 0 && (
            <Card className="border-slate-800 bg-slate-900/90 shadow-md">
              <CardHeader className="border-b border-slate-800 pb-3">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <UsersIcon className="size-4 text-emerald-400" />
                  Consolidated Employee Payout Summary ({consolidatedEmployees.length} Selected Employees)
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Total payout per employee across all selected companies and runs. Total matches the Total Group Net Payout.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-950/60">
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-xs font-bold text-slate-300">Employee ID</TableHead>
                      <TableHead className="text-xs font-bold text-slate-300">Employee Name</TableHead>
                      <TableHead className="text-xs font-bold text-slate-300">Company Name</TableHead>
                      <TableHead className="text-xs font-bold text-slate-300">Bank Name</TableHead>
                      <TableHead className="text-xs font-bold text-slate-300">Bank Account Number</TableHead>
                      <TableHead className="text-xs font-bold text-slate-300 text-right">Net Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consolidatedEmployees.map((emp) => (
                      <TableRow key={emp.employeeId} className="border-slate-800/60 hover:bg-slate-800/40">
                        <TableCell className="text-xs font-mono text-slate-400">{emp.employeeNumber}</TableCell>
                        <TableCell className="text-xs font-bold text-white">{emp.employeeName}</TableCell>
                        <TableCell className="text-xs text-slate-300">{emp.companyName}</TableCell>
                        <TableCell className="text-xs text-slate-300">{emp.bankName}</TableCell>
                        <TableCell className="text-xs font-mono text-slate-300">{emp.bankAccountNumber}</TableCell>
                        <TableCell className="text-xs text-right font-mono font-bold text-emerald-400">
                          ₱{emp.netAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 border-slate-700 bg-slate-950/80 font-bold">
                      <TableCell colSpan={5} className="text-xs font-bold text-white">
                        Total Consolidated Net Payout ({consolidatedEmployees.length} Employees)
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono font-bold text-emerald-400 text-sm">
                        ₱{groupTotals.grandTotalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Filter & Configuration Dialogue Box Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl bg-slate-900 border-slate-800 text-slate-100 p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <SlidersHorizontalIcon className="size-5 text-blue-400" />
              Configure Company Payout Report
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Select which companies and individual employees to include in the report. Unselected items will be excluded from report totals and generated PDFs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
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

              <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2">
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
                        onChange={() => {}}
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

            {/* 2. Employee Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  2. Included Employees ({tempEmployeeIds.filter((id) => availableEmployees.some((e) => e.id === id)).length} of {availableEmployees.length} selected)
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={handleSelectAllEmployees}
                    className="text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-800 h-6 px-2"
                  >
                    Select All
                  </Button>
                  <span className="text-slate-600 text-xs">|</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={handleClearAllEmployees}
                    className="text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 h-6 px-2"
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Filter employees by name or number..."
                  value={employeeSearchFilter}
                  onChange={(e) => setEmployeeSearchFilter(e.target.value)}
                  className="pl-8 h-8 text-xs bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>

              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-1.5">
                {tempCompanyIds.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No companies selected above.</p>
                ) : filteredEmployeesForModal.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No employees match filter for selected companies.</p>
                ) : (
                  filteredEmployeesForModal.map((emp) => {
                    const isChecked = tempEmployeeIds.includes(emp.id);
                    return (
                      <div
                        key={emp.id}
                        onClick={() => handleToggleEmployee(emp.id)}
                        className="flex items-center space-x-3 cursor-pointer p-1 rounded hover:bg-slate-800/60 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="size-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 accent-blue-600"
                        />
                        <div className="text-xs flex items-center justify-between w-full pr-2">
                          <span className="font-semibold text-white">{emp.name}</span>
                          <span className="font-mono text-slate-400 text-[11px]">{emp.employeeNumber} · {emp.companyCode}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 3. Payroll Run Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  3. Included Payroll Runs ({tempRunIds.includes("ALL") ? availableRuns.length : tempRunIds.filter((id) => availableRuns.some((r) => r.runId === id)).length} of {availableRuns.length} selected)
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={handleSelectAllRuns}
                    className="text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-800 h-6 px-2"
                  >
                    Select All
                  </Button>
                  <span className="text-slate-600 text-xs">|</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={handleClearAllRuns}
                    className="text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 h-6 px-2"
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {availableRuns.length > 4 && (
                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Filter payroll runs by number, company, or cutoff..."
                    value={runSearchFilter}
                    onChange={(e) => setRunSearchFilter(e.target.value)}
                    className="pl-8 h-8 text-xs bg-slate-950 border-slate-800 text-slate-100"
                  />
                </div>
              )}

              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-1.5">
                {tempCompanyIds.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No companies selected above.</p>
                ) : filteredRunsForModal.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No payroll runs match filter for selected companies.</p>
                ) : (
                  filteredRunsForModal.map((run) => {
                    const isChecked = tempRunIds.includes("ALL") || tempRunIds.includes(run.runId);
                    return (
                      <div
                        key={run.runId}
                        onClick={() => handleToggleRun(run.runId)}
                        className="flex items-center space-x-3 cursor-pointer p-1.5 rounded hover:bg-slate-800/60 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="size-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                        />
                        <div className="text-xs flex items-center justify-between w-full pr-2">
                          <span className="font-semibold text-white">{run.label}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
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
