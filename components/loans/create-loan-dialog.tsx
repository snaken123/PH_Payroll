"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createLoanSchema,
  type CreateLoanFormValues,
  type CreateLoanInput,
  loanCategoryValues,
  loanDeductionFrequencyValues,
} from "@/lib/validations/loan";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function CreateLoanDialog({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateLoanFormValues, unknown, CreateLoanInput>({
    resolver: zodResolver(createLoanSchema),
    defaultValues: { employeeId, category: "CASH_ADVANCE", deductionFrequency: "EVERY_CUTOFF" },
  });

  const category = watch("category");

  async function onSubmit(values: CreateLoanInput) {
    setSubmitting(true);
    // employeeId is a stable prop, not user input — pass it explicitly
    // rather than relying on RHF's defaultValues to carry an unregistered
    // field through to submission.
    const res = await fetch("/api/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, employeeId }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error?.formErrors?.join?.(", ") ?? body?.error ?? "Failed to add loan");
      return;
    }

    toast.success(values.category === "CASH_ADVANCE" ? "Cash advance request submitted for approval" : "Loan added");
    reset({ employeeId, category: "CASH_ADVANCE", deductionFrequency: "EVERY_CUTOFF" });
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>New loan</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add loan / cash advance</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <input type="hidden" {...register("employeeId")} />
          <div className="space-y-1">
            <Label>Category</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {loanCategoryValues.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {category === "CASH_ADVANCE" && (
              <p className="text-sm text-muted-foreground">
                Cash advances start as a pending request and require manager approval before any deduction happens.
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="e.g. SSS Salary Loan" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="principal">Principal (₱)</Label>
            <Input id="principal" type="number" step="0.01" {...register("principal")} />
            {errors.principal && <p className="text-sm text-destructive">{errors.principal.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="installmentAmount">Installment per cutoff (₱)</Label>
            <Input id="installmentAmount" type="number" step="0.01" {...register("installmentAmount")} />
            {errors.installmentAmount && (
              <p className="text-sm text-destructive">{errors.installmentAmount.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="deductionFrequency">Deduction frequency</Label>
            <Controller
              control={control}
              name="deductionFrequency"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="deductionFrequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {loanDeductionFrequencyValues.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v === "EVERY_CUTOFF" ? "Every cutoff (twice a month)" : "Monthly (second cutoff only)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="termMonths">Term (months, optional)</Label>
            <Input id="termMonths" type="number" {...register("termMonths")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="startDate">Start date</Label>
            <Input id="startDate" type="date" {...register("startDate")} />
            {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="referenceNumber">Reference number (optional)</Label>
            <Input id="referenceNumber" {...register("referenceNumber")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Add loan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
