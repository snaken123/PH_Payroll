"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetricCard } from "@/components/ui/metric-card";
import { toast } from "sonner";
import {
  FileSpreadsheetIcon,
  DownloadIcon,
  Building2Icon,
  UsersIcon,
  BanknoteIcon,
  CalendarIcon,
  CheckCircle2Icon,
  SearchIcon,
  CheckSquareIcon,
  SquareIcon,
  LandmarkIcon,
} from "lucide-react";

interface PostedRunOption {
  id: string;
  runNumber: number;
  companyId: string;
  companyName: string;
  companyCode: string;
  cutoffStart: string;
  cutoffEnd: string;
  payDate: string;
  employeeCount: number;
  label: string;
}

interface CompanyOption {
  id: string;
  legalName: string;
  companyCode: string;
}

interface EmployeePayslipItem {
  payslipId: string;
  employeeId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  formattedName: string;
  companyId: string;
  companyName: string;
  companyCode: string;
  bankName: string;
  bankAccountNumber: string;
  netPay: number;
}

export function BdoBobReport() {
  const [postedRuns, setPostedRuns] = useState<PostedRunOption[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("");

  const [runDetails, setRunDetails] = useState<any>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [employees, setEmployees] = useState<EmployeePayslipItem[]>([]);

  // Selection & Input states
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [employeeRemarks, setEmployeeRemarks] = useState<Record<string, string>>({});
  const [batchRemarksText, setBatchRemarksText] = useState<string>("");

  // Report Parameters
  const [uploadDate, setUploadDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [companyCode, setCompanyCode] = useState<string>("C86I");
  const [batchNumber, setBatchNumber] = useState<string>("1");

  // Filters & Loading states
  const [loadingRuns, setLoadingRuns] = useState<boolean>(true);
  const [loadingRunDetails, setLoadingRunDetails] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Fetch initial list of posted runs
  useEffect(() => {
    async function loadPostedRuns() {
      setLoadingRuns(true);
      try {
        const res = await fetch("/api/admin/special-reports/bdo-bob");
        if (res.ok) {
          const data = await res.json();
          setPostedRuns(data.postedRuns || []);
          if (data.postedRuns && data.postedRuns.length > 0) {
            setSelectedRunId(data.postedRuns[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load posted runs", err);
      } finally {
        setLoadingRuns(false);
      }
    }
    loadPostedRuns();
  }, []);

  // Fetch details when a posted run is selected
  useEffect(() => {
    if (!selectedRunId) return;

    async function loadRunDetails() {
      setLoadingRunDetails(true);
      try {
        const res = await fetch(`/api/admin/special-reports/bdo-bob?runId=${encodeURIComponent(selectedRunId)}`);
        if (res.ok) {
          const data = await res.json();
          setRunDetails(data.runDetails);
          setCompanies(data.companies || []);
          setEmployees(data.employees || []);

          // Default all companies and employees as selected
          const compIds = (data.companies || []).map((c: CompanyOption) => c.id);
          const empIds = (data.employees || []).map((e: EmployeePayslipItem) => e.employeeId);
          setSelectedCompanyIds(compIds);
          setSelectedEmployeeIds(empIds);

          // Pre-fill company code from run if available
          if (data.runDetails?.companyCode) {
            setCompanyCode(data.runDetails.companyCode);
          }
        }
      } catch (err) {
        console.error("Failed to load run details", err);
      } finally {
        setLoadingRunDetails(false);
      }
    }
    loadRunDetails();
  }, [selectedRunId]);

  // Filter employees based on selected companies & search string
  const filteredEmployees = useMemo(() => {
    if (selectedCompanyIds.length === 0) return [];
    let list = employees.filter((e) => selectedCompanyIds.includes(e.companyId));
    if (searchFilter.trim()) {
      const q = searchFilter.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.formattedName.toLowerCase().includes(q) ||
          e.employeeNumber.toLowerCase().includes(q) ||
          e.companyName.toLowerCase().includes(q) ||
          e.bankAccountNumber.toLowerCase().includes(q)
      );
    }
    return list;
  }, [employees, selectedCompanyIds, searchFilter]);

  // Selected employees list
  const selectedEmployeesList = useMemo(() => {
    return employees.filter((e) => selectedEmployeeIds.includes(e.employeeId) && selectedCompanyIds.includes(e.companyId));
  }, [employees, selectedEmployeeIds, selectedCompanyIds]);

  const totalSelectedAmount = useMemo(() => {
    return selectedEmployeesList.reduce((sum, e) => sum + e.netPay, 0);
  }, [selectedEmployeesList]);

  // Handlers
  function handleToggleCompany(id: string) {
    if (selectedCompanyIds.includes(id)) {
      setSelectedCompanyIds(selectedCompanyIds.filter((c) => c !== id));
    } else {
      setSelectedCompanyIds([...selectedCompanyIds, id]);
    }
  }

  function handleSelectAllCompanies() {
    setSelectedCompanyIds(companies.map((c) => c.id));
  }

  function handleDeselectAllCompanies() {
    setSelectedCompanyIds([]);
  }

  function handleToggleEmployee(id: string) {
    if (selectedEmployeeIds.includes(id)) {
      setSelectedEmployeeIds(selectedEmployeeIds.filter((e) => e !== id));
    } else {
      setSelectedEmployeeIds([...selectedEmployeeIds, id]);
    }
  }

  function handleSelectAllEmployees() {
    const ids = filteredEmployees.map((e) => e.employeeId);
    setSelectedEmployeeIds(Array.from(new Set([...selectedEmployeeIds, ...ids])));
  }

  function handleDeselectAllEmployees() {
    const idsToFilter = new Set(filteredEmployees.map((e) => e.employeeId));
    setSelectedEmployeeIds(selectedEmployeeIds.filter((id) => !idsToFilter.has(id)));
  }

  function handleRemarkChange(employeeId: string, val: string) {
    setEmployeeRemarks((prev) => ({ ...prev, [employeeId]: val }));
  }

  function handleApplyBatchRemarks() {
    if (selectedEmployeeIds.length === 0) {
      toast.error("Please select at least one employee first");
      return;
    }
    const updated: Record<string, string> = { ...employeeRemarks };
    selectedEmployeeIds.forEach((id) => {
      updated[id] = batchRemarksText;
    });
    setEmployeeRemarks(updated);
    toast.success(`Applied remarks to ${selectedEmployeeIds.length} selected employees`);
  }

  async function handleGenerateReport() {
    if (!selectedRunId) {
      toast.error("Please select a posted payroll run");
      return;
    }
    if (selectedEmployeesList.length === 0) {
      toast.error("Please select at least one employee for the report");
      return;
    }

    setGenerating(true);

    try {
      const payload = {
        runId: selectedRunId,
        uploadDate,
        companyCode: companyCode || "C86I",
        batch: batchNumber || "1",
        employeeSelections: selectedEmployeesList.map((e) => ({
          employeeId: e.employeeId,
          payslipId: e.payslipId,
          remarks: employeeRemarks[e.employeeId] || "",
        })),
      };

      const res = await fetch("/api/admin/special-reports/bdo-bob/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        toast.error(errJson?.error || "Failed to generate BDO BOB report");
        setGenerating(false);
        return;
      }

      // Download file directly
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = `BDO_BOB_Converter_${companyCode}_${uploadDate.replace(/-/g, "")}.xls`;
      if (contentDisposition && contentDisposition.includes("filename=")) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("BDO BOB Report generated and downloaded successfully!");
    } catch (err: any) {
      toast.error("Error generating report: " + err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <LandmarkIcon className="size-5 text-amber-400" />
            BDO BOB (Bank of Banking) Special Report
          </h2>
          <p className="text-xs text-slate-400">
            Superadmin Special Report — Populates official BDO ATM Payroll Converter template spreadsheet (<span className="font-mono text-amber-300">BDO ATM Payroll Converter for BOB -.GPFRESH COMPANY INC.xls</span>) preserving all formatting and embedded macros.
          </p>
        </div>

        <Badge variant="outline" className="border-amber-500/40 bg-amber-950/30 text-amber-300 text-xs py-1 px-3 w-fit font-mono">
          Superadmin Exclusive Report
        </Badge>
      </div>

      {/* STEP 1: Choose Posted Payroll Run */}
      <Card className="border-slate-800 bg-slate-900 shadow-md">
        <CardHeader className="p-4 border-b border-slate-800 bg-slate-950/50">
          <CardTitle className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">1</span>
            Select Posted Payroll Run
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Choose from posted payroll runs to populate bank disbursement data.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {loadingRuns ? (
            <div className="py-6 text-center text-xs text-slate-400">Loading posted payroll runs...</div>
          ) : postedRuns.length === 0 ? (
            <div className="py-6 text-center text-xs text-amber-400 italic bg-amber-950/20 border border-amber-900/40 rounded-lg p-4">
              No posted payroll runs found. Only payroll runs in <strong>POSTED</strong> status can be used for BDO BOB converter reports.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {postedRuns.map((run) => {
                const isSelected = selectedRunId === run.id;
                return (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => setSelectedRunId(run.id)}
                    className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-blue-950/60 border-blue-500/80 ring-1 ring-blue-500/50 text-white shadow-md"
                        : "bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-bold text-blue-300 font-mono">Run #{run.runNumber}</span>
                      <Badge variant="outline" className="text-[10px] bg-emerald-950/80 border-emerald-500/50 text-emerald-300 font-mono">
                        POSTED
                      </Badge>
                    </div>
                    <span className="text-xs font-semibold text-slate-100">{run.companyName}</span>
                    <span className="text-[11px] text-slate-400 mt-1">
                      Cutoff: {run.cutoffStart} to {run.cutoffEnd}
                    </span>
                    <div className="flex items-center justify-between w-full text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
                      <span>Pay Date: {run.payDate}</span>
                      <span className="font-mono font-semibold text-slate-300">{run.employeeCount} employees</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* STEP 2 & STEP 3: Select Companies, Employees, & Remarks */}
      {selectedRunId && runDetails && (
        <>
          {/* STEP 2: Select Companies */}
          <Card className="border-slate-800 bg-slate-900 shadow-md">
            <CardHeader className="p-4 border-b border-slate-800 bg-slate-950/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">2</span>
                  Select Included Companies ({selectedCompanyIds.length} / {companies.length})
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Select companies associated with this payroll run.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="xs" onClick={handleSelectAllCompanies} className="text-xs text-blue-400 hover:text-white h-7">
                  Select All
                </Button>
                <Button type="button" variant="ghost" size="xs" onClick={handleDeselectAllCompanies} className="text-xs text-slate-400 hover:text-white h-7">
                  Deselect All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                {companies.map((c) => {
                  const isChecked = selectedCompanyIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleToggleCompany(c.id)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        isChecked
                          ? "bg-blue-950/80 border-blue-500/60 text-white"
                          : "bg-slate-950/30 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <Building2Icon className={`size-3.5 ${isChecked ? "text-blue-400" : "text-slate-500"}`} />
                      {c.legalName}
                      <span className="font-mono text-[10px] text-slate-400">({c.companyCode})</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* STEP 3: Select Employees & Remarks */}
          <Card className="border-slate-800 bg-slate-900 shadow-md">
            <CardHeader className="p-4 border-b border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">3</span>
                  Select Employees &amp; Remarks ({selectedEmployeeIds.length} / {filteredEmployees.length} Selected)
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Select individual employees and specify optional remarks for each line item.
                </CardDescription>
              </div>

              {/* Batch Remarks Bar */}
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Set remarks for all selected..."
                  value={batchRemarksText}
                  onChange={(e) => setBatchRemarksText(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs h-8 w-48 text-slate-100"
                />
                <Button
                  type="button"
                  size="xs"
                  onClick={handleApplyBatchRemarks}
                  className="bg-slate-800 hover:bg-slate-700 text-xs h-8 px-3 text-slate-200"
                >
                  Set All Remarks
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Search & Actions Bar */}
              <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <SearchIcon className="size-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search by name, emp #, account #..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs h-8 text-slate-100"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="xs" onClick={handleSelectAllEmployees} className="text-xs text-blue-400 hover:text-white h-7">
                    Select Filtered
                  </Button>
                  <Button type="button" variant="ghost" size="xs" onClick={handleDeselectAllEmployees} className="text-xs text-slate-400 hover:text-white h-7">
                    Deselect Filtered
                  </Button>
                </div>
              </div>

              {/* Employee Table */}
              <div className="rounded-lg border border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-950/80">
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="w-10 text-center">
                        <input
                          type="checkbox"
                          checked={filteredEmployees.length > 0 && filteredEmployees.every((e) => selectedEmployeeIds.includes(e.employeeId))}
                          onChange={(e) => (e.target.checked ? handleSelectAllEmployees() : handleDeselectAllEmployees())}
                          className="size-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                        />
                      </TableHead>
                      <TableHead className="text-xs font-bold text-slate-300">Emp #</TableHead>
                      <TableHead className="text-xs font-bold text-slate-300">Employee Name (Formatted)</TableHead>
                      <TableHead className="text-xs font-bold text-slate-300">Company</TableHead>
                      <TableHead className="text-xs font-bold text-slate-300">Account Number</TableHead>
                      <TableHead className="text-xs font-bold text-emerald-400 text-right">Net Pay Amount</TableHead>
                      <TableHead className="text-xs font-bold text-slate-300">Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-xs text-slate-500">
                          No employee records match the selected company and search filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmployees.map((emp) => {
                        const isChecked = selectedEmployeeIds.includes(emp.employeeId);
                        return (
                          <TableRow
                            key={emp.employeeId}
                            className={`border-slate-800/60 hover:bg-slate-800/40 transition-colors ${
                              !isChecked ? "opacity-50 bg-slate-950/40" : ""
                            }`}
                          >
                            <TableCell className="text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleEmployee(emp.employeeId)}
                                className="size-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                              />
                            </TableCell>
                            <TableCell className="text-xs font-mono text-slate-400">{emp.employeeNumber}</TableCell>
                            <TableCell className="text-xs font-bold text-white font-mono">{emp.formattedName}</TableCell>
                            <TableCell className="text-xs text-slate-300">{emp.companyName}</TableCell>
                            <TableCell className="text-xs font-mono text-amber-300">{emp.bankAccountNumber || "—"}</TableCell>
                            <TableCell className="text-xs text-right font-mono font-bold text-emerald-400">
                              ₱{emp.netPay.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="w-56">
                              <Input
                                type="text"
                                placeholder="Optional remarks..."
                                value={employeeRemarks[emp.employeeId] ?? ""}
                                onChange={(e) => handleRemarkChange(emp.employeeId, e.target.value)}
                                className="bg-slate-950 border-slate-800 text-xs h-7 text-slate-100"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* STEP 4: Report Parameters & Generation Footer */}
          <Card className="border-slate-800 bg-slate-900 shadow-md">
            <CardHeader className="p-4 border-b border-slate-800 bg-slate-950/50">
              <CardTitle className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">4</span>
                Report Parameters &amp; Export
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Specify upload date, company code, and batch number before populating the BDO BOB spreadsheet.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-5">
              {/* Parameters Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border border-slate-800 bg-slate-950/50">
                <div className="space-y-1.5">
                  <Label htmlFor="uploadDate" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <CalendarIcon className="size-3.5 text-blue-400" /> Upload Date
                  </Label>
                  <Input
                    id="uploadDate"
                    type="date"
                    value={uploadDate}
                    onChange={(e) => setUploadDate(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs h-9 text-slate-100 font-mono"
                  />
                  <p className="text-[10px] text-slate-500">Populated into Cell B2 in BDO BOB template</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="companyCode" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Building2Icon className="size-3.5 text-blue-400" /> Company Code
                  </Label>
                  <Input
                    id="companyCode"
                    type="text"
                    placeholder="e.g. C86I"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs h-9 text-slate-100 font-mono"
                  />
                  <p className="text-[10px] text-slate-500">Populated into Cell B3 (e.g. BDO Company Code)</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="batchNumber" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <LandmarkIcon className="size-3.5 text-blue-400" /> Batch Number
                  </Label>
                  <Input
                    id="batchNumber"
                    type="text"
                    placeholder="1"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs h-9 text-slate-100 font-mono"
                  />
                  <p className="text-[10px] text-slate-500">Populated into Cell B5 (Numeric batch number)</p>
                </div>
              </div>

              {/* Metric KPI Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <MetricCard
                  title="Selected Employees"
                  value={selectedEmployeesList.length}
                  subtitle="Included in export file"
                  icon={UsersIcon}
                />
                <MetricCard
                  title="Total Disbursed Net Pay"
                  value={`₱${totalSelectedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                  subtitle="Total amount to be populated"
                  icon={BanknoteIcon}
                />
                <MetricCard
                  title="Target File"
                  value="BDO BOB .XLS"
                  subtitle="Preserves formatting &amp; macros"
                  icon={FileSpreadsheetIcon}
                />
              </div>

              {/* Generate & Download Button */}
              <div className="flex items-center justify-end pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  disabled={generating || selectedEmployeesList.length === 0}
                  onClick={handleGenerateReport}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 h-10 gap-2 shadow-lg"
                >
                  <DownloadIcon className="size-4" />
                  {generating ? "Populating & Exporting XLS..." : "Generate & Download BDO BOB Report (.xls)"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
