"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MailIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  SendIcon,
  CheckSquareIcon,
  SquareIcon,
  Loader2Icon,
  SparklesIcon,
  InfoIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface PayslipEmployeeItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  departmentName: string;
  email: string | null;
  hasEmail: boolean;
  netPay: string;
  grossPay: string;
}

interface ApprovedRun {
  id: string;
  runNumber: number;
  status: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  payslipCount: number;
  payslipsWithEmailCount: number;
  payslips: PayslipEmployeeItem[];
}

export function SendEmailPayslipsDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [runs, setRuns] = useState<ApprovedRun[]>([]);
  const [hasResendKey, setHasResendKey] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());

  // Result state after sending
  const [sendResult, setSendResult] = useState<{
    sentCount: number;
    failedCount: number;
    results: { employeeId: string; employeeName: string; email: string | null; success: boolean; error?: string; simulated?: boolean }[];
  } | null>(null);

  useEffect(() => {
    if (open) {
      fetchApprovedRuns();
    } else {
      resetState();
    }
  }, [open]);

  function resetState() {
    setSelectedRunId("");
    setSelectedEmployeeIds(new Set());
    setSendResult(null);
  }

  async function fetchApprovedRuns() {
    setLoading(true);
    try {
      const res = await fetch("/api/payroll/approved-runs");
      if (!res.ok) throw new Error("Failed to load approved payroll runs");
      const data = await res.json();
      setRuns(data.runs || []);
      setHasResendKey(Boolean(data.hasResendKey));

      if (data.runs && data.runs.length > 0) {
        const firstRun = data.runs[0];
        setSelectedRunId(firstRun.id);
        // Pre-select all employees with valid emails
        const validIds = new Set<string>(
          firstRun.payslips.filter((p: PayslipEmployeeItem) => p.hasEmail).map((p: PayslipEmployeeItem) => p.employeeId)
        );
        setSelectedEmployeeIds(validIds);
      }
    } catch (err: unknown) {
      toast.error("Failed to fetch approved payroll runs");
    } finally {
      setLoading(false);
    }
  }

  function handleRunChange(runId: string) {
    setSelectedRunId(runId);
    setSendResult(null);
    const targetRun = runs.find((r) => r.id === runId);
    if (targetRun) {
      const validIds = new Set<string>(
        targetRun.payslips.filter((p) => p.hasEmail).map((p) => p.employeeId)
      );
      setSelectedEmployeeIds(validIds);
    } else {
      setSelectedEmployeeIds(new Set());
    }
  }

  const selectedRun = runs.find((r) => r.id === selectedRunId);

  function toggleEmployee(employeeId: string) {
    const next = new Set(selectedEmployeeIds);
    if (next.has(employeeId)) {
      next.delete(employeeId);
    } else {
      next.add(employeeId);
    }
    setSelectedEmployeeIds(next);
  }

  function toggleSelectAll() {
    if (!selectedRun) return;
    const validPayslips = selectedRun.payslips.filter((p) => p.hasEmail);
    if (selectedEmployeeIds.size === validPayslips.length) {
      setSelectedEmployeeIds(new Set());
    } else {
      setSelectedEmployeeIds(new Set(validPayslips.map((p) => p.employeeId)));
    }
  }

  async function handleSendEmailPayslips() {
    if (!selectedRunId || selectedEmployeeIds.size === 0) {
      toast.error("Please select at least one employee with a valid email address.");
      return;
    }

    setSending(true);
    setSendResult(null);

    try {
      const res = await fetch("/api/payroll/send-email-payslips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payrollRunId: selectedRunId,
          employeeIds: Array.from(selectedEmployeeIds),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send email payslips");
      }

      setSendResult({
        sentCount: data.sentCount,
        failedCount: data.failedCount,
        results: data.results,
      });

      if (data.sentCount > 0) {
        toast.success(`Successfully dispatched ${data.sentCount} payslip email(s).`);
      } else {
        toast.error("No email payslips could be sent.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error sending email payslips";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold shadow-xs">
            <MailIcon className="size-3.5 text-blue-600" /> Send Email Payslips
          </Button>
        }
      />

      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <MailIcon className="size-4 text-blue-600" /> Email Employee Payslips (Resend)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Dispatch itemized digital payslips with attached PDF reports directly to employee inbox addresses. Select a fully approved or posted payroll run.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 space-y-2">
            <Loader2Icon className="size-6 animate-spin mx-auto text-blue-600" />
            <p>Loading approved payroll runs and employee email records...</p>
          </div>
        ) : runs.length === 0 ? (
          <div className="py-8 px-4 text-center border border-amber-200 bg-amber-50 rounded-lg text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 space-y-2">
            <AlertCircleIcon className="size-8 text-amber-600 mx-auto" />
            <p className="font-semibold text-xs">No Fully Approved or Posted Payroll Runs Available</p>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 max-w-md mx-auto">
              Email payslips can only be dispatched for payroll runs in <strong>APPROVED</strong> or <strong>POSTED</strong> status. Once you approve a payroll run, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            {/* Status Banner */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <SparklesIcon className="size-4 text-blue-600" />
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Resend Service Status:
                </span>
              </div>
              {hasResendKey ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Resend API Connected
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300">
                  Simulation / Dev Mode
                </span>
              )}
            </div>

            {/* Run Selector */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Select Approved Payroll Run <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedRunId}
                onChange={(e) => handleRunChange(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900 shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                {runs.map((run) => (
                  <option key={run.id} value={run.id}>
                    Run #{run.runNumber} ({run.status}) — Period: {run.periodStart} to {run.periodEnd} (Pay Date: {run.payDate}) — {run.payslipCount} employees
                  </option>
                ))}
              </select>
            </div>

            {selectedRun && (
              <>
                {/* Selection Toolbar */}
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={toggleSelectAll}
                      className="text-xs gap-1.5 px-2 h-7 font-semibold"
                    >
                      <CheckSquareIcon className="size-3.5 text-blue-600" />
                      {selectedEmployeeIds.size === selectedRun.payslips.filter((p) => p.hasEmail).length
                        ? "Deselect All"
                        : "Select All Valid"}
                    </Button>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500">
                    Selected: <strong>{selectedEmployeeIds.size}</strong> of {selectedRun.payslips.length} employees
                  </span>
                </div>

                {/* Employee Roster Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0">
                      <tr>
                        <th className="p-2.5 w-10 text-center">#</th>
                        <th className="p-2.5 font-semibold text-slate-700 dark:text-slate-300">Employee</th>
                        <th className="p-2.5 font-semibold text-slate-700 dark:text-slate-300">Email Address</th>
                        <th className="p-2.5 font-semibold text-slate-700 dark:text-slate-300 text-right">Net Pay</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {selectedRun.payslips.map((item) => {
                        const isSelected = selectedEmployeeIds.has(item.employeeId);
                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors ${
                              !item.hasEmail ? "opacity-60 bg-slate-50/50 dark:bg-slate-900/20" : ""
                            }`}
                          >
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={!item.hasEmail || sending}
                                onChange={() => toggleEmployee(item.employeeId)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-3.5 cursor-pointer disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">
                              <div>{item.employeeName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                ID: {item.employeeNumber} • {item.departmentName}
                              </div>
                            </td>
                            <td className="p-2.5">
                              {item.hasEmail ? (
                                <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                                  {item.email}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
                                  Missing Email
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                              ₱{Number(item.netPay).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Send Execution Results Banner */}
                {sendResult && (
                  <div className="p-3 rounded-lg border bg-blue-50/60 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900/40 space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-blue-900 dark:text-blue-200 text-xs">
                      <span>Dispatch Summary</span>
                      <span>
                        Sent: {sendResult.sentCount} | Failed: {sendResult.failedCount}
                      </span>
                    </div>
                    <ul className="text-[11px] space-y-0.5 max-h-28 overflow-y-auto font-mono text-slate-700 dark:text-slate-300">
                      {sendResult.results.map((res) => (
                        <li key={res.employeeId} className="flex items-center justify-between">
                          <span>
                            {res.employeeName} ({res.email || "No Email"})
                          </span>
                          {res.success ? (
                            <span className="text-emerald-600 font-bold">
                              ✓ {res.simulated ? "Simulated" : "Sent"}
                            </span>
                          ) : (
                            <span className="text-rose-600 font-bold">✗ {res.error}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={sending}
          >
            Close
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={sending || loading || !selectedRun || selectedEmployeeIds.size === 0}
            onClick={handleSendEmailPayslips}
            className="gap-1.5 font-semibold"
          >
            {sending ? (
              <>
                <Loader2Icon className="size-3.5 animate-spin" /> Sending Email Payslips...
              </>
            ) : (
              <>
                <SendIcon className="size-3.5" /> Send {selectedEmployeeIds.size} Email Payslips
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
