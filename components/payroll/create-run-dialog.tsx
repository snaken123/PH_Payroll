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

export function CreateRunDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreatePayrollRunInput>({ resolver: zodResolver(createPayrollRunSchema) });

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
            <Label>Period type</Label>
            <Controller
              control={control}
              name="periodType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIRST_HALF">1st–15th (no statutory deduction)</SelectItem>
                    <SelectItem value="SECOND_HALF">16th–end (SSS/PhilHealth/Pag-IBIG deducted)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.periodType && <p className="text-sm text-destructive">{errors.periodType.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="cutoffStart">Cutoff start</Label>
            <Input id="cutoffStart" type="date" {...register("cutoffStart")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cutoffEnd">Cutoff end</Label>
            <Input id="cutoffEnd" type="date" {...register("cutoffEnd")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="payDate">Pay date</Label>
            <Input id="payDate" type="date" {...register("payDate")} />
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
