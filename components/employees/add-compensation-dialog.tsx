"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
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
import { payBasisValues } from "@/lib/validations/employee";
import { toast } from "sonner";

interface FormValues {
  effectiveFrom: string;
  payBasis: (typeof payBasisValues)[number];
  basicRate: string;
  standardWorkDaysPerMonth: string;
}

export function AddCompensationDialog({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, control, reset } = useForm<FormValues>({
    defaultValues: { payBasis: "MONTHLY_RATE" },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const res = await fetch(`/api/employees/${employeeId}/compensation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error?.formErrors?.join?.(", ") ?? body?.error ?? "Failed to update compensation");
      return;
    }

    toast.success("Compensation updated");
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>New rate</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update compensation</DialogTitle>
          <DialogDescription>
            Closes the current rate and starts a new one — past payroll history is unaffected.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="effectiveFrom">Effective from</Label>
            <Input id="effectiveFrom" type="date" required {...register("effectiveFrom")} />
          </div>
          <div className="space-y-1">
            <Label>Pay basis</Label>
            <Controller
              control={control}
              name="payBasis"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue>{(value: string) => value.replaceAll("_", " ")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {payBasisValues.map((v) => (
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
            <Label htmlFor="basicRate">Basic rate (₱)</Label>
            <Input id="basicRate" type="number" step="0.01" required {...register("basicRate")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="standardWorkDaysPerMonth">Standard work days/month divisor (optional)</Label>
            <Input
              id="standardWorkDaysPerMonth"
              type="number"
              step="0.01"
              {...register("standardWorkDaysPerMonth")}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
