"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { timesheetStatusValues, holidayTypeValues } from "@/lib/validations/attendance";
import { toast } from "sonner";

export interface TimesheetFormValues {
  status: (typeof timesheetStatusValues)[number];
  scheduledHours: number;
  lateMinutes: number;
  undertimeMinutes: number;
  regularHours: number;
  overtimeHours: number;
  nightDiffHours: number;
  holidayType: (typeof holidayTypeValues)[number] | "";
  isRestDay: boolean;
}

export function EditTimesheetDialog({
  open,
  onOpenChange,
  employeeId,
  workDate,
  initialValues,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  workDate: string;
  initialValues: TimesheetFormValues;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, control } = useForm<TimesheetFormValues>({
    values: initialValues,
  });

  async function onSubmit(values: TimesheetFormValues) {
    setSubmitting(true);
    const res = await fetch("/api/timesheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId,
        workDate,
        ...values,
        holidayType: values.holidayType || null,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error?.formErrors?.join?.(", ") ?? body?.error ?? "Failed to save");
      return;
    }

    toast.success("Saved");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{workDate}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timesheetStatusValues.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <Label>Holiday type</Label>
            <Controller
              control={control}
              name="holidayType"
              render={({ field }) => (
                <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {holidayTypeValues.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="regularHours">Regular hours</Label>
            <Input id="regularHours" type="number" step="0.25" {...register("regularHours")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="overtimeHours">Overtime hours</Label>
            <Input id="overtimeHours" type="number" step="0.25" {...register("overtimeHours")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="nightDiffHours">Night diff hours</Label>
            <Input id="nightDiffHours" type="number" step="0.25" {...register("nightDiffHours")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="scheduledHours">Scheduled hours</Label>
            <Input id="scheduledHours" type="number" step="0.25" {...register("scheduledHours")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lateMinutes">Late minutes</Label>
            <Input id="lateMinutes" type="number" {...register("lateMinutes")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="undertimeMinutes">Undertime minutes</Label>
            <Input id="undertimeMinutes" type="number" {...register("undertimeMinutes")} />
          </div>
          <div className="flex items-center gap-2 self-end pb-2">
            <Controller
              control={control}
              name="isRestDay"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} id="isRestDay" />
              )}
            />
            <Label htmlFor="isRestDay">Rest day</Label>
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
