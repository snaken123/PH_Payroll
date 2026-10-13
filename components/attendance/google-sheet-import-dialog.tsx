"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileSpreadsheetIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  ClockIcon,
  UserXIcon,
  UsersIcon,
  SparklesIcon,
  ArrowRightIcon,
  CopyIcon,
} from "lucide-react";
import type { AttendanceImportSummary, ProcessedTimesheetRow } from "@/lib/services/googleSheetAttendanceService";

interface GoogleSheetImportDialogProps {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  companyName?: string;
  companyCode?: string;
  disabled?: boolean;
  onImportComplete?: (rows: ProcessedTimesheetRow[], summary: AttendanceImportSummary) => void;
}

export function GoogleSheetImportDialog({
  start,
  end,
  companyName = "Active Company",
  companyCode = "",
  disabled = false,
  onImportComplete,
}: GoogleSheetImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [autoSave, setAutoSave] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Result state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<AttendanceImportSummary | null>(null);

  function resetState() {
    setErrorMessage(null);
    setSummary(null);
    setSubmitting(false);
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      resetState();
    }
  }

  async function handleProcess() {
    if (!url.trim()) {
      toast.error("Please enter a Google Spreadsheet link.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/attendance/import-google-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          start,
          end,
          autoSave,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to process Google Spreadsheet attendance.");
        setSubmitting(false);
        return;
      }

      setSummary(data.summary);
      toast.success(
        `Successfully processed attendance: ${data.summary.totalPresentDays} present logs, ${data.summary.totalAbsentDays} absences tagged.`
      );

      if (onImportComplete && data.rows) {
        onImportComplete(data.rows, data.summary);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected network error occurred while connecting to the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        disabled={disabled}
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="gap-1.5 text-xs font-semibold border-emerald-300 text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 hover:text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 shadow-xs"
          >
            <FileSpreadsheetIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            Import Google Sheet
          </Button>
        }
      />

      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <FileSpreadsheetIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
            Import Attendance from Google Sheets
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Provide a shared Google Drive or Google Spreadsheet link to parse biometric punch records for the active cutoff.
          </DialogDescription>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Active Context Information Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-xs">
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider text-[10px]">
                Active Company (Cell B1)
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {companyName} {companyCode ? `(${companyCode})` : ""}
              </span>
            </div>
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider text-[10px]">
                Target Attendance Cutoff (Cells B2 &amp; B3)
              </span>
              <span className="font-mono font-bold text-blue-700 dark:text-blue-300 text-sm">
                {start} &rarr; {end}
              </span>
            </div>
          </div>

          {/* ERROR DIALOGUE / BANNER */}
          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/90 dark:border-rose-900/60 dark:bg-rose-950/40 p-4 space-y-2.5 animate-in fade-in-50">
              <div className="flex items-start gap-2.5">
                <AlertTriangleIcon className="size-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 dark:text-rose-200">
                    Cannot Process Attendance Spreadsheet
                  </h4>
                  <p className="text-xs font-medium text-rose-800 dark:text-rose-300 leading-relaxed">
                    {errorMessage}
                  </p>
                </div>
              </div>

              {/* Validation Checklist Guide */}
              <div className="pt-2 border-t border-rose-200/80 dark:border-rose-900/40 text-[11px] text-rose-800 dark:text-rose-300 grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">&bull; Cell B1:</span> Must match Company ID or Code
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">&bull; Cell B2:</span> Must match Start Date ({start})
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">&bull; Cell B3:</span> Must match End Date ({end})
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">&bull; Row 5+:</span> User ID, Name, Check Time, Status
                </div>
              </div>
            </div>
          )}

          {/* SUCCESS SUMMARY PROMPT & KPI VIEW */}
          {summary && (
            <div className="space-y-4 animate-in fade-in-50">
              <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-200 bg-emerald-50/90 dark:border-emerald-900/60 dark:bg-emerald-950/40">
                <div className="flex items-center gap-2">
                  <CheckCircle2Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Attendance Logs Successfully Processed!
                  </span>
                </div>
                <span className="text-[11px] font-semibold font-mono text-emerald-800 dark:text-emerald-300">
                  {summary.totalEmployees} employees evaluated
                </span>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                  <div className="text-[10px] uppercase font-semibold text-slate-500">Days Present</div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {summary.totalPresentDays}
                  </div>
                  <div className="text-[10px] text-slate-400">Punches logged</div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                  <div className="text-[10px] uppercase font-semibold text-slate-500">Total Absences</div>
                  <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                    {summary.totalAbsentDays}
                  </div>
                  <div className="text-[10px] text-slate-400">Untagged non-rest days</div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                  <div className="text-[10px] uppercase font-semibold text-slate-500">Total Tardiness</div>
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                    {summary.totalLateMinutes} <span className="text-xs font-normal">mins</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Late minutes tagged</div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                  <div className="text-[10px] uppercase font-semibold text-slate-500">Total Overtime</div>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                    {summary.totalOtHours} <span className="text-xs font-normal">hrs</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Approved OT hours</div>
                </div>
              </div>

              {/* Per-Employee Summary Breakdown Table */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Employee Breakdown Summary
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Absences tagged per Rule 5
                  </span>
                </div>

                <div className="rounded-lg border border-slate-200/90 dark:border-slate-800 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
                      <TableRow>
                        <TableHead className="text-xs">Employee</TableHead>
                        <TableHead className="text-xs text-center">Present</TableHead>
                        <TableHead className="text-xs text-center">Absences</TableHead>
                        <TableHead className="text-xs text-center">Rest Days</TableHead>
                        <TableHead className="text-xs text-right">Late (mins)</TableHead>
                        <TableHead className="text-xs text-right">OT (hrs)</TableHead>
                        <TableHead className="text-xs text-right">Regular Hrs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.employees.map((emp) => (
                        <TableRow key={emp.employeeId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <TableCell className="text-xs">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{emp.employeeName}</div>
                            <div className="font-mono text-[10px] text-slate-500">{emp.employeeNumber}</div>
                          </TableCell>
                          <TableCell className="text-xs text-center font-semibold text-emerald-700 dark:text-emerald-400">
                            {emp.presentDays}
                          </TableCell>
                          <TableCell className="text-xs text-center">
                            {emp.absentDays > 0 ? (
                              <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px]">
                                {emp.absentDays} absent
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-center text-slate-600 dark:text-slate-400">
                            {emp.restDays}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                            {emp.totalLateMinutes > 0 ? `${emp.totalLateMinutes}m` : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono tabular-nums text-blue-600 dark:text-blue-400 font-semibold">
                            {emp.totalOtHours > 0 ? `${emp.totalOtHours}h` : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                            {emp.totalRegularHours}h
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {/* Form Input for Google Drive Link */}
          {!summary && (
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="gsheet_url" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Google Spreadsheet Link <span className="text-rose-500">*</span></span>
                  <a
                    href="https://support.google.com/docs/answer/2494822"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-normal text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    Share settings guide <ExternalLinkIcon className="size-3" />
                  </a>
                </Label>
                <Input
                  id="gsheet_url"
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit?gid=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="font-mono text-xs"
                  disabled={submitting}
                />
                <p className="text-[11px] text-slate-500">
                  Ensure the spreadsheet is shared as <strong>&ldquo;Anyone with the link can view&rdquo;</strong> so the system can read Cell B1, B2, B3 and biometric rows.
                </p>
              </div>

              {/* Option: Auto-save to database */}
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <Checkbox
                  id="gsheet_autosave"
                  checked={autoSave}
                  onCheckedChange={(checked) => setAutoSave(Boolean(checked))}
                  disabled={submitting}
                />
                <Label htmlFor="gsheet_autosave" className="text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-300">
                  Persist attendance entries directly to database upon successful import
                </Label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 gap-2 sm:gap-0">
          {summary ? (
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={resetState}
                className="text-xs"
              >
                Import Another Sheet
              </Button>
              <Button
                size="sm"
                onClick={() => setOpen(false)}
                className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2Icon className="size-3.5" />
                Done &amp; View Updated Grid
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleProcess}
                disabled={submitting || !url.trim()}
                className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting ? (
                  <>
                    <SparklesIcon className="size-3.5 animate-spin" />
                    Validating &amp; Processing...
                  </>
                ) : (
                  <>
                    <FileSpreadsheetIcon className="size-3.5" />
                    Process &amp; Import Attendance
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
