"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPayrollRunSchema, type CreatePayrollRunInput } from "@/lib/validations/payroll";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Search, Clock, ShieldAlert, ArrowLeft, AlertTriangle } from "lucide-react";

type SchedulePreset = "STANDARD_1_15" | "MIDMONTH_10_25" | "CUSTOM";

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

export function CreateRunDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingOt, setCheckingOt] = useState(false);
  const [step, setStep] = useState<"FORM" | "ATTENDANCE_APPROVAL">("FORM");
  const [activeTab, setActiveTab] = useState<"OVERTIME" | "UNDERTIME">("OVERTIME");
  const [preset, setPreset] = useState<SchedulePreset>("STANDARD_1_15");

  const [employeesWithOt, setEmployeesWithOt] = useState<EmployeeOtPreview[]>([]);
  const [selectedOtIds, setSelectedOtIds] = useState<string[]>([]);
  const [otHoursMap, setOtHoursMap] = useState<Record<string, number>>({});
  const [otSearchQuery, setOtSearchQuery] = useState("");

  const [employeesWithUndertime, setEmployeesWithUndertime] = useState<EmployeeUndertimePreview[]>([]);
  const [ignoredUndertimeIds, setIgnoredUndertimeIds] = useState<string[]>([]);
  const [excludeSaturdayTardiness, setExcludeSaturdayTardiness] = useState(true);
  const [excludeSaturdayUndertime, setExcludeSaturdayUndertime] = useState(true);
  const [undertimeSearchQuery, setUndertimeSearchQuery] = useState("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CreatePayrollRunInput>({
    resolver: zodResolver(createPayrollRunSchema),
    defaultValues: {
      periodType: "FIRST_HALF",
      excludeSaturdayTardiness: true,
      excludeSaturdayUndertime: true,
    },
  });

  function resetDialogState() {
    setStep("FORM");
    setActiveTab("OVERTIME");
    setEmployeesWithOt([]);
    setSelectedOtIds([]);
    setOtHoursMap({});
    setOtSearchQuery("");
    setEmployeesWithUndertime([]);
    setIgnoredUndertimeIds([]);
    setExcludeSaturdayTardiness(true);
    setExcludeSaturdayUndertime(true);
    setUndertimeSearchQuery("");
    setCheckingOt(false);
    setSubmitting(false);
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      resetDialogState();
    }
  }

  function applyPreset(selectedPreset: SchedulePreset, periodType: "FIRST_HALF" | "SECOND_HALF") {
    setPreset(selectedPreset);
    if (selectedPreset === "CUSTOM") return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (selectedPreset === "STANDARD_1_15") {
      if (periodType === "FIRST_HALF") {
        const start = new Date(Date.UTC(year, month, 1));
        const end = new Date(Date.UTC(year, month, 15));
        const pay = new Date(Date.UTC(year, month, 20));
        setValue("cutoffStart", start.toISOString().split("T")[0]);
        setValue("cutoffEnd", end.toISOString().split("T")[0]);
        setValue("payDate", pay.toISOString().split("T")[0]);
      } else {
        const start = new Date(Date.UTC(year, month, 16));
        const lastDay = new Date(Date.UTC(year, month + 1, 0)).getDate();
        const end = new Date(Date.UTC(year, month, lastDay));
        const pay = new Date(Date.UTC(year, month + 1, 5));
        setValue("cutoffStart", start.toISOString().split("T")[0]);
        setValue("cutoffEnd", end.toISOString().split("T")[0]);
        setValue("payDate", pay.toISOString().split("T")[0]);
      }
    } else if (selectedPreset === "MIDMONTH_10_25") {
      if (periodType === "FIRST_HALF") {
        const start = new Date(Date.UTC(year, month - 1, 26));
        const end = new Date(Date.UTC(year, month, 10));
        const pay = new Date(Date.UTC(year, month, 15));
        setValue("cutoffStart", start.toISOString().split("T")[0]);
        setValue("cutoffEnd", end.toISOString().split("T")[0]);
        setValue("payDate", pay.toISOString().split("T")[0]);
      } else {
        const start = new Date(Date.UTC(year, month, 11));
        const end = new Date(Date.UTC(year, month, 25));
        const lastDay = new Date(Date.UTC(year, month + 1, 0)).getDate();
        const pay = new Date(Date.UTC(year, month, Math.min(30, lastDay)));
        setValue("cutoffStart", start.toISOString().split("T")[0]);
        setValue("cutoffEnd", end.toISOString().split("T")[0]);
        setValue("payDate", pay.toISOString().split("T")[0]);
      }
    }
  }

  async function executeRunPayroll(
    values: CreatePayrollRunInput,
    approvedOtIds?: string[],
    approvedOtHoursMap?: Record<string, number>,
    ignoredUndertimeIdsList?: string[],
    excludeSatTardiness: boolean = true,
    excludeSatUndertime: boolean = true
  ) {
    setSubmitting(true);
    const payload = {
      ...values,
      approvedOtEmployeeIds: approvedOtIds,
      approvedOtHoursMap: approvedOtHoursMap,
      ignoredUndertimeEmployeeIds: ignoredUndertimeIdsList,
      excludeSaturdayTardiness: excludeSatTardiness,
      excludeSaturdayUndertime: excludeSatUndertime,
    };

    const res = await fetch("/api/payroll/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error?.formErrors?.join?.(", ") ?? body?.error ?? "Failed to run payroll");
      return;
    }

    const body = await res.json();
    toast.success("Payroll run computed");
    setOpen(false);
    resetDialogState();
    router.push(`/dashboard/payroll/${body.runId}`);
  }

  async function handleInitialSubmit(values: CreatePayrollRunInput) {
    setCheckingOt(true);
    try {
      const url = `/api/payroll/runs/ot-preview?cutoffStart=${encodeURIComponent(values.cutoffStart)}&cutoffEnd=${encodeURIComponent(values.cutoffEnd)}`;
      const res = await fetch(url);
      if (!res.ok) {
        await executeRunPayroll(values);
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
        setIgnoredUndertimeIds([]); // By default, compute/deduct undertime

        if (otList.length > 0) {
          setActiveTab("OVERTIME");
        } else {
          setActiveTab("UNDERTIME");
        }
        setStep("ATTENDANCE_APPROVAL");
      } else {
        await executeRunPayroll(values);
      }
    } catch {
      await executeRunPayroll(values);
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>Run payroll</DialogTrigger>
      <DialogContent className="max-w-md md:max-w-lg">
        {step === "FORM" ? (
          <>
            <DialogHeader>
              <DialogTitle>Run payroll</DialogTitle>
              <DialogDescription>
                Computes a draft run for every active employee in this cutoff. Review before approving
                and posting.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleInitialSubmit)} className="space-y-3">
              <div className="space-y-1">
                <Label>Pay Schedule Preset</Label>
                <Select
                  value={preset}
                  onValueChange={(val) => applyPreset(val as SchedulePreset, getValues("periodType") || "FIRST_HALF")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select schedule style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD_1_15">Standard (1st–15th &amp; 16th–End)</SelectItem>
                    <SelectItem value="MIDMONTH_10_25">Mid-Month Cycle (11th–25th &amp; 26th–10th)</SelectItem>
                    <SelectItem value="CUSTOM">Custom Date Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Period type</Label>
                <Controller
                  control={control}
                  name="periodType"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val);
                        applyPreset(preset, val as "FIRST_HALF" | "SECOND_HALF");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIRST_HALF">
                          1st Cutoff (e.g. 1st–15th or 26th–9th) — Withholding Tax
                        </SelectItem>
                        <SelectItem value="SECOND_HALF">
                          2nd Cutoff (e.g. 16th–End or 10th–25th) — SSS / PhilHealth / Pag-IBIG
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.periodType && <p className="text-sm text-destructive">{errors.periodType.message}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="cutoffStart">Cutoff start date</Label>
                <Input id="cutoffStart" type="date" {...register("cutoffStart")} />
                {errors.cutoffStart && <p className="text-sm text-destructive">{errors.cutoffStart.message}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="cutoffEnd">Cutoff end date</Label>
                <Input id="cutoffEnd" type="date" {...register("cutoffEnd")} />
                {errors.cutoffEnd && <p className="text-sm text-destructive">{errors.cutoffEnd.message}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="payDate">Pay date</Label>
                <Input id="payDate" type="date" {...register("payDate")} />
                {errors.payDate && <p className="text-sm text-destructive">{errors.payDate.message}</p>}
              </div>

              <DialogFooter>
                <Button type="submit" disabled={checkingOt || submitting}>
                  {checkingOt ? "Checking Attendance..." : submitting ? "Computing..." : "Compute payroll"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                <Clock className="size-5 text-amber-600" />
                Attendance &amp; Hours Review
              </DialogTitle>
              <DialogDescription>
                Review overtime approvals and undertime deductions for this cutoff period.
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
                    Unapproved overtime will be excluded from pay, while raw timesheet records remain intact.
                  </span>
                </div>
              </div>
            )}

            {activeTab === "UNDERTIME" && employeesWithUndertime.length > 0 && (
              <div className="space-y-3 py-1">
                <div className="space-y-2 px-3 py-2.5 bg-muted/30 dark:bg-muted/10 rounded-md border text-xs">
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      id="exclude-saturday-tardiness-create"
                      checked={excludeSaturdayTardiness}
                      onCheckedChange={(checked) => setExcludeSaturdayTardiness(!!checked)}
                    />
                    <Label htmlFor="exclude-saturday-tardiness-create" className="text-xs font-medium cursor-pointer select-none">
                      Exclude tardiness (late) on Saturdays for everyone
                    </Label>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      id="exclude-saturday-undertime-create"
                      checked={excludeSaturdayUndertime}
                      onCheckedChange={(checked) => setExcludeSaturdayUndertime(!!checked)}
                    />
                    <Label htmlFor="exclude-saturday-undertime-create" className="text-xs font-medium cursor-pointer select-none">
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
                    Employees marked as <strong>Ignored</strong> will not have undertime deducted from basic pay for this cutoff run.
                  </span>
                </div>
              </div>
            )}

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setStep("FORM")}
                disabled={submitting}
                className="gap-1 text-xs"
              >
                <ArrowLeft className="size-3.5" /> Back
              </Button>
              <Button
                type="button"
                disabled={submitting}
                onClick={() => {
                  const finalApprovedOtHoursMap: Record<string, number> = {};
                  for (const empId of selectedOtIds) {
                    finalApprovedOtHoursMap[empId] = otHoursMap[empId] ?? 0;
                  }
                  executeRunPayroll(
                    getValues(),
                    selectedOtIds,
                    finalApprovedOtHoursMap,
                    ignoredUndertimeIds,
                    excludeSaturdayTardiness,
                    excludeSaturdayUndertime
                  );
                }}
              >
                {submitting ? "Computing payroll..." : "Confirm & Run Payroll"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
