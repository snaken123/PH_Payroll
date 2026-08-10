"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPayrollRunSchema, type CreatePayrollRunInput } from "@/lib/validations/payroll";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type SchedulePreset = "STANDARD_1_15" | "MIDMONTH_10_25" | "CUSTOM";

export function CreateRunDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preset, setPreset] = useState<SchedulePreset>("STANDARD_1_15");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<CreatePayrollRunInput>({
    resolver: zodResolver(createPayrollRunSchema),
    defaultValues: {
      periodType: "FIRST_HALF",
    },
  });

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
        // 26th of previous month to 9th of current month
        const start = new Date(Date.UTC(year, month - 1, 26));
        const end = new Date(Date.UTC(year, month, 9));
        const pay = new Date(Date.UTC(year, month, 15));
        setValue("cutoffStart", start.toISOString().split("T")[0]);
        setValue("cutoffEnd", end.toISOString().split("T")[0]);
        setValue("payDate", pay.toISOString().split("T")[0]);
      } else {
        // 10th of current month to 25th of current month
        const start = new Date(Date.UTC(year, month, 10));
        const end = new Date(Date.UTC(year, month, 25));
        const lastDay = new Date(Date.UTC(year, month + 1, 0)).getDate();
        const pay = new Date(Date.UTC(year, month, Math.min(30, lastDay)));
        setValue("cutoffStart", start.toISOString().split("T")[0]);
        setValue("cutoffEnd", end.toISOString().split("T")[0]);
        setValue("payDate", pay.toISOString().split("T")[0]);
      }
    }
  }

  async function onSubmit(values: CreatePayrollRunInput) {
    setSubmitting(true);
    const res = await fetch("/api/payroll/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
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
    router.push(`/dashboard/payroll/${body.runId}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Run payroll</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run payroll</DialogTitle>
          <DialogDescription>
            Computes a draft run for every active employee in this cutoff. Review before approving
            and posting.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label>Pay Schedule Preset</Label>
            <Select
              value={preset}
              onValueChange={(val) => applyPreset(val as SchedulePreset, "FIRST_HALF")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select schedule style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STANDARD_1_15">Standard (1st–15th &amp; 16th–End)</SelectItem>
                <SelectItem value="MIDMONTH_10_25">Mid-Month Cycle (10th–25th &amp; 26th–9th)</SelectItem>
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
            <Button type="submit" disabled={submitting}>
              {submitting ? "Computing..." : "Compute payroll"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
