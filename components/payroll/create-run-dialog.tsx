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
import { Search, Clock, ShieldAlert, ArrowLeft } from "lucide-react";

type SchedulePreset = "STANDARD_1_15" | "MIDMONTH_10_25" | "CUSTOM";

interface EmployeeOtPreview {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  positionTitle: string;
  totalOtHours: number;
}

export function CreateRunDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingOt, setCheckingOt] = useState(false);
  const [step, setStep] = useState<"FORM" | "OT_APPROVAL">("FORM");
  const [preset, setPreset] = useState<SchedulePreset>("STANDARD_1_15");
  const [employeesWithOt, setEmployeesWithOt] = useState<EmployeeOtPreview[]>([]);
  const [selectedOtIds, setSelectedOtIds] = useState<string[]>([]);
  const [otSearchQuery, setOtSearchQuery] = useState("");

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
    },
  });

  function resetDialogState() {
    setStep("FORM");
    setEmployeesWithOt([]);
    setSelectedOtIds([]);
    setOtSearchQuery("");
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
    const month = now.getMonth(); // 0-indexed

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
        // 26th of previous month to 10th of current month
        const start = new Date(Date.UTC(year, month - 1, 26));
        const end = new Date(Date.UTC(year, month, 10));
        const pay = new Date(Date.UTC(year, month, 15));
        setValue("cutoffStart", start.toISOString().split("T")[0]);
        setValue("cutoffEnd", end.toISOString().split("T")[0]);
        setValue("payDate", pay.toISOString().split("T")[0]);
      } else {
        // 11th of current month to 25th of current month
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

  async function executeRunPayroll(values: CreatePayrollRunInput, approvedOtIds?: string[]) {
    setSubmitting(true);
    const payload = {
      ...values,
      approvedOtEmployeeIds: approvedOtIds,
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

      if (otList.length > 0) {
        setEmployeesWithOt(otList);
        setSelectedOtIds(otList.map((e) => e.employeeId));
        setStep("OT_APPROVAL");
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

  const filteredOtEmployees = employeesWithOt.filter((emp) => {
    const q = otSearchQuery.toLowerCase().trim();
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
                  {checkingOt ? "Checking Overtime..." : submitting ? "Computing..." : "Compute payroll"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                <Clock className="size-5 text-amber-600" />
                Overtime Approval Dialogue
              </DialogTitle>
              <DialogDescription>
                Select employees whose overtime pay is approved for this cutoff. Unchecked employees will have OT pay excluded from their payslips, but their timesheet logs will remain intact.
              </DialogDescription>
            </DialogHeader>

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

              <div className="max-h-[260px] overflow-y-auto border rounded-md p-2 space-y-1.5 bg-muted/20">
                {filteredOtEmployees.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No matching employees found.
                  </p>
                ) : (
                  filteredOtEmployees.map((emp) => {
                    const isChecked = selectedOtIds.includes(emp.employeeId);
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
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleOtEmployee(emp.employeeId)}
                          />
                          <div>
                            <div className="text-sm font-medium leading-none">{emp.employeeName}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              #{emp.employeeNumber} {emp.positionTitle ? `• ${emp.positionTitle}` : ""}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            {emp.totalOtHours} hrs OT
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="rounded-md bg-amber-50 dark:bg-amber-950/40 p-2.5 border border-amber-200 dark:border-amber-900 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                <span>
                  Employees who extend hours due to late logout but are unapproved will receive <strong>0.0 hrs OT pay</strong> while retaining their raw timesheet records.
                </span>
              </div>
            </div>

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
                onClick={() => executeRunPayroll(getValues(), selectedOtIds)}
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
