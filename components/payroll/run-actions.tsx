"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { toast } from "sonner";
import { Search, Clock, ShieldAlert, AlertTriangle } from "lucide-react";

interface EmployeeOtPreview {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  positionTitle: string;
  totalOtHours: number;
}

interface TimesheetUndertimeEntry {
  workDate: string;
  lateMinutes: number;
  undertimeMinutes: number;
}

interface EmployeeUndertimePreview {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  positionTitle: string;
  totalUndertimeMinutes: number;
  totalUndertimeHours: number;
  entries?: TimesheetUndertimeEntry[];
}

function getEffectiveUndertime(
  emp: EmployeeUndertimePreview,
  excludeSatTardiness: boolean,
  excludeSatUndertime: boolean
) {
  if (!emp.entries || emp.entries.length === 0) {
    return { minutes: emp.totalUndertimeMinutes, hours: emp.totalUndertimeHours };
  }
  const minutes = emp.entries.reduce((sum, entry) => {
    const isSat = new Date(entry.workDate).getUTCDay() === 6;
    let late = entry.lateMinutes;
    let undertime = entry.undertimeMinutes;
    if (isSat && excludeSatTardiness) late = 0;
    if (isSat && excludeSatUndertime) undertime = 0;
    return sum + late + undertime;
  }, 0);
  const hours = Math.round((minutes / 60) * 100) / 100;
  return { minutes, hours };
}

export function RunActions({
  runId,
  status,
  cutoffStart,
  cutoffEnd,
}: {
  runId: string;
  status: string;
  cutoffStart?: Date | string;
  cutoffEnd?: Date | string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [checkingOt, setCheckingOt] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voidOpen, setVoidOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);

  // Attendance Approval modal state for Recompute
  const [otDialogOpen, setOtDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"OVERTIME" | "UNDERTIME">("OVERTIME");

  const [employeesWithOt, setEmployeesWithOt] = useState<EmployeeOtPreview[]>([]);
  const [selectedOtIds, setSelectedOtIds] = useState<string[]>([]);
  const [otHoursMap, setOtHoursMap] = useState<Record<string, number>>({});
  const [otSearchQuery, setOtSearchQuery] = useState("");

  const [employeesWithUndertime, setEmployeesWithUndertime] = useState<EmployeeUndertimePreview[]>([]);
  const [ignoredUndertimeIds, setIgnoredUndertimeIds] = useState<string[]>([]);
  const [excludeSaturdayTardiness, setExcludeSaturdayTardiness] = useState(true);
  const [excludeSaturdayUndertime, setExcludeSaturdayUndertime] = useState(true);
  const [undertimeSearchQuery, setUndertimeSearchQuery] = useState("");

  async function callAction(action: "submit" | "approve" | "post" | "void" | "recompute" | "unapprove", body?: unknown) {
    setBusy(true);
    const res = await fetch(`/api/payroll/runs/${runId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);

    if (!res.ok) {
      const responseBody = await res.json().catch(() => null);
      toast.error(responseBody?.error ?? `Failed to ${action} run`);
      return;
    }

    if (action === "recompute") {
      const responseBody = await res.json();
      toast.success("Payslips recomputed successfully!");
      setOtDialogOpen(false);
      if (responseBody.runId) {
        router.push(`/dashboard/payroll/${responseBody.runId}`);
        router.refresh();
      }
      return;
    }

    toast.success(
      `Run ${
        action === "submit"
          ? "submitted for approval"
          : action === "approve"
          ? "approved"
          : action === "post"
          ? "posted"
          : action === "unapprove"
          ? "reverted to draft"
          : "voided"
      }`
    );
    router.refresh();
  }

  async function handleRecomputeClick() {
    if (!cutoffStart || !cutoffEnd) {
      await callAction("recompute");
      return;
    }

    setCheckingOt(true);
    try {
      const startStr = typeof cutoffStart === "string" ? cutoffStart : cutoffStart.toISOString();
      const endStr = typeof cutoffEnd === "string" ? cutoffEnd : cutoffEnd.toISOString();
      const url = `/api/payroll/runs/ot-preview?cutoffStart=${encodeURIComponent(startStr)}&cutoffEnd=${encodeURIComponent(endStr)}`;
      const res = await fetch(url);
      if (!res.ok) {
        await callAction("recompute");
        return;
      }
      const data = await res.json();
      const otList: EmployeeOtPreview[] = data.employeesWithOt ?? [];
      const undertimeList: EmployeeUndertimePreview[] = data.employeesWithUndertime ?? [];

      if (otList.length > 0 || undertimeList.length > 0) {
        setEmployeesWithOt(otList);
        setSelectedOtIds(otList.map((e) => e.employeeId));
        const initialMap: Record<string, number> = {};
        for (const e of otList) {
          initialMap[e.employeeId] = e.totalOtHours;
        }
        setOtHoursMap(initialMap);

        setEmployeesWithUndertime(undertimeList);
        setIgnoredUndertimeIds([]);

        if (otList.length > 0) {
          setActiveTab("OVERTIME");
        } else {
          setActiveTab("UNDERTIME");
        }
        setOtDialogOpen(true);
      } else {
        await callAction("recompute");
      }
    } catch {
      await callAction("recompute");
    } finally {
      setCheckingOt(false);
    }
  }

  function toggleOtEmployee(id: string) {
    setSelectedOtIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleSelectAllOt() {
    setSelectedOtIds(employeesWithOt.map((e) => e.employeeId));
  }

  function handleDeselectAllOt() {
    setSelectedOtIds([]);
  }

  function toggleIgnoreUndertime(id: string) {
    setIgnoredUndertimeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleIgnoreAllUndertime() {
    setIgnoredUndertimeIds(employeesWithUndertime.map((e) => e.employeeId));
  }

  function handleDeductAllUndertime() {
    setIgnoredUndertimeIds([]);
  }

  const filteredOtEmployees = employeesWithOt.filter((emp) => {
    const q = otSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      emp.employeeName.toLowerCase().includes(q) ||
      emp.employeeNumber.toLowerCase().includes(q) ||
      emp.positionTitle.toLowerCase().includes(q)
    );
  });

  const filteredUndertimeEmployees = employeesWithUndertime.filter((emp) => {
    const q = undertimeSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      emp.employeeName.toLowerCase().includes(q) ||
      emp.employeeNumber.toLowerCase().includes(q) ||
      emp.positionTitle.toLowerCase().includes(q)
    );
  });

  if (status === "DRAFT" || status === "PENDING_APPROVAL") {
    return (
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleRecomputeClick} disabled={busy || checkingOt}>
          {checkingOt ? "Checking Attendance..." : busy ? "Recomputing..." : "Recompute Payslips"}
        </Button>

        {/* Attendance Review Modal for Recompute */}
        <Dialog open={otDialogOpen} onOpenChange={setOtDialogOpen}>
          <DialogContent className="max-w-md md:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                <Clock className="size-5 text-amber-600" />
                Recompute — Attendance &amp; Hours Review
              </DialogTitle>
              <DialogDescription>
                Review overtime approvals and undertime deductions before recomputing payslips.
              </DialogDescription>
            </DialogHeader>

            {(employeesWithOt.length > 0 && employeesWithUndertime.length > 0) && (
              <div className="flex border-b text-xs font-medium gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("OVERTIME")}
                  className={`pb-2 border-b-2 transition-colors ${
                    activeTab === "OVERTIME"
                      ? "border-primary text-primary font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Overtime Approval ({employeesWithOt.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("UNDERTIME")}
                  className={`pb-2 border-b-2 transition-colors ${
                    activeTab === "UNDERTIME"
                      ? "border-primary text-primary font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Undertime / Tardiness ({employeesWithUndertime.length})
                </button>
              </div>
            )}

            {activeTab === "OVERTIME" && employeesWithOt.length > 0 && (
              <div className="space-y-3 py-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Filter employee name or number..."
                      value={otSearchQuery}
                      onChange={(e) => setOtSearchQuery(e.target.value)}
                      className="pl-8 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="outline" size="sm" onClick={handleSelectAllOt} className="text-xs">
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDeselectAllOt} className="text-xs">
                      Clear All
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground flex justify-between items-center px-1">
                  <span>
                    Approved: <strong className="text-foreground">{selectedOtIds.length}</strong> of {employeesWithOt.length} employees
                  </span>
                </div>

                <div className="max-h-[240px] overflow-y-auto border rounded-md p-2 space-y-1.5 bg-muted/20">
                  {filteredOtEmployees.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      No matching employees found.
                    </p>
                  ) : (
                    filteredOtEmployees.map((emp) => {
                      const isChecked = selectedOtIds.includes(emp.employeeId);
                      const currentHours = otHoursMap[emp.employeeId] ?? emp.totalOtHours;
                      return (
                        <div
                          key={emp.employeeId}
                          onClick={() => toggleOtEmployee(emp.employeeId)}
                          className={`flex items-center justify-between p-2.5 rounded-md border cursor-pointer transition-colors ${
                            isChecked
                              ? "bg-background border-primary/40 shadow-2xs"
                              : "bg-muted/40 border-transparent opacity-75"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleOtEmployee(emp.employeeId)}
                            />
                            <div className="truncate">
                              <div className="text-sm font-medium leading-none truncate">{emp.employeeName}</div>
                              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                #{emp.employeeNumber} {emp.positionTitle ? `• ${emp.positionTitle}` : ""}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Input
                              type="number"
                              step="0.25"
                              min="0"
                              value={currentHours}
                              onChange={(e) => {
                                const val = Math.max(0, Number(e.target.value) || 0);
                                setOtHoursMap((prev) => ({ ...prev, [emp.employeeId]: val }));
                              }}
                              className="h-7 w-20 text-xs font-semibold text-right"
                              disabled={!isChecked}
                            />
                            <span className="text-xs text-muted-foreground font-medium">hrs OT</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="rounded-md bg-amber-50 dark:bg-amber-950/40 p-2.5 border border-amber-200 dark:border-amber-900 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                  <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                  <span>
                    Unapproved employees will receive <strong>0.0 hrs OT pay</strong> while retaining their raw timesheet records.
                  </span>
                </div>
              </div>
            )}

            {activeTab === "UNDERTIME" && employeesWithUndertime.length > 0 && (
              <div className="space-y-3 py-1">
                <div className="space-y-2 px-3 py-2.5 bg-muted/30 dark:bg-muted/10 rounded-md border text-xs">
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      id="exclude-saturday-tardiness-recompute"
                      checked={excludeSaturdayTardiness}
                      onCheckedChange={(checked) => setExcludeSaturdayTardiness(!!checked)}
                    />
                    <Label htmlFor="exclude-saturday-tardiness-recompute" className="text-xs font-medium cursor-pointer select-none">
                      Exclude tardiness (late) on Saturdays for everyone
                    </Label>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      id="exclude-saturday-undertime-recompute"
                      checked={excludeSaturdayUndertime}
                      onCheckedChange={(checked) => setExcludeSaturdayUndertime(!!checked)}
                    />
                    <Label htmlFor="exclude-saturday-undertime-recompute" className="text-xs font-medium cursor-pointer select-none">
                      Exclude undertime on Saturdays for everyone
                    </Label>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Filter employee name or number..."
                      value={undertimeSearchQuery}
                      onChange={(e) => setUndertimeSearchQuery(e.target.value)}
                      className="pl-8 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="outline" size="sm" onClick={handleDeductAllUndertime} className="text-xs">
                      Deduct All
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleIgnoreAllUndertime} className="text-xs">
                      Ignore All
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground flex justify-between items-center px-1">
                  <span>
                    Deducting undertime: <strong className="text-foreground">
                      {employeesWithUndertime.filter(emp => !ignoredUndertimeIds.includes(emp.employeeId) && getEffectiveUndertime(emp, excludeSaturdayTardiness, excludeSaturdayUndertime).minutes > 0).length}
                    </strong> | Ignored: <strong className="text-foreground">{ignoredUndertimeIds.length}</strong>
                  </span>
                </div>

                <div className="max-h-[240px] overflow-y-auto border rounded-md p-2 space-y-1.5 bg-muted/20">
                  {filteredUndertimeEmployees.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      No matching employees found.
                    </p>
                  ) : (
                    filteredUndertimeEmployees.map((emp) => {
                      const isIgnored = ignoredUndertimeIds.includes(emp.employeeId);
                      const { minutes: effMins, hours: effHours } = getEffectiveUndertime(emp, excludeSaturdayTardiness, excludeSaturdayUndertime);
                      return (
                        <div
                          key={emp.employeeId}
                          onClick={() => toggleIgnoreUndertime(emp.employeeId)}
                          className={`flex items-center justify-between p-2.5 rounded-md border cursor-pointer transition-colors ${
                            isIgnored
                              ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                              : "bg-background border-border"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Checkbox
                              checked={isIgnored}
                              onCheckedChange={() => toggleIgnoreUndertime(emp.employeeId)}
                            />
                            <div className="truncate">
                              <div className="text-sm font-medium leading-none truncate">{emp.employeeName}</div>
                              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                #{emp.employeeNumber} {emp.positionTitle ? `• ${emp.positionTitle}` : ""}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <div className="text-right">
                              <div className="text-xs font-semibold">{effMins} mins</div>
                              <div className="text-[10px] text-muted-foreground">({effHours} hrs)</div>
                            </div>
                            <span
                              className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                                isIgnored
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : effMins === 0
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              }`}
                            >
                              {isIgnored ? "Ignored (Waived)" : effMins === 0 ? "Excluded (Saturday)" : "Deduct"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="rounded-md bg-amber-50 dark:bg-amber-950/40 p-2.5 border border-amber-200 dark:border-amber-900 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>
                    Employees marked as <strong>Ignored</strong> will not have undertime deducted from basic pay during this recompute run.
                  </span>
                </div>
              </div>
            )}

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setOtDialogOpen(false)}
                disabled={busy}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => {
                  const finalApprovedOtHoursMap: Record<string, number> = {};
                  for (const empId of selectedOtIds) {
                    finalApprovedOtHoursMap[empId] = otHoursMap[empId] ?? 0;
                  }
                  callAction("recompute", {
                    approvedOtEmployeeIds: selectedOtIds,
                    approvedOtHoursMap: finalApprovedOtHoursMap,
                    ignoredUndertimeEmployeeIds: ignoredUndertimeIds,
                    excludeSaturdayTardiness: excludeSaturdayTardiness,
                    excludeSaturdayUndertime: excludeSaturdayUndertime,
                  });
                }}
              >
                {busy ? "Recomputing..." : "Confirm & Recompute Payslips"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {status === "DRAFT" && (
          <Button variant="outline" onClick={() => callAction("submit")} disabled={busy}>
            Submit for Approval
          </Button>
        )}
        <Button onClick={() => callAction("approve")} disabled={busy}>
          Approve
        </Button>
        <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
          <DialogTrigger render={<Button variant="outline" />}>Void</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Void this run</DialogTitle>
            </DialogHeader>
            <div className="space-y-1">
              <Label htmlFor="voidReason">Reason</Label>
              <Input id="voidReason" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
            </div>
            <DialogFooter>
              <Button
                variant="destructive"
                disabled={busy || !voidReason}
                onClick={() => {
                  callAction("void", { reason: voidReason });
                  setVoidOpen(false);
                }}
              >
                Void run
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (status === "APPROVED") {
    return (
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => callAction("unapprove")} disabled={busy}>
          {busy ? "Reverting..." : "Revert to Draft"}
        </Button>
        <Dialog open={postOpen} onOpenChange={setPostOpen}>
          <DialogTrigger render={<Button disabled={busy} />}>Post (final — locks this run)</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Post this payroll run?</DialogTitle>
              <DialogDescription>
                This locks the run and its payslips permanently — no further edits or voids will be possible.
                This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                disabled={busy}
                onClick={() => {
                  callAction("post");
                  setPostOpen(false);
                }}
              >
                {busy ? "Posting..." : "Post run"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return null;
}
