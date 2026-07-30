"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, XIcon } from "lucide-react";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  compensationRecordSchema,
  payBasisValues,
  type CompensationRecordFormValues,
  type CompensationRecordInput,
} from "@/lib/validations/employee";
import { toast } from "sonner";

export function AddCompensationDialog({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CompensationRecordFormValues, unknown, CompensationRecordInput>({
    resolver: zodResolver(compensationRecordSchema),
    defaultValues: { payBasis: "MONTHLY_RATE", allowances: [] },
  });

  const { fields: allowanceFields, append: appendAllowance, remove: removeAllowance } = useFieldArray({
    control,
    name: "allowances",
  });

  async function onSubmit(values: CompensationRecordInput) {
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
            {errors.effectiveFrom && <p className="text-sm text-destructive">{errors.effectiveFrom.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="payBasis">Pay basis</Label>
            <Controller
              control={control}
              name="payBasis"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="payBasis">
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
            {errors.basicRate && <p className="text-sm text-destructive">{errors.basicRate.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="standardWorkDaysPerMonth">Standard work days/month divisor (optional)</Label>
            <Input
              id="standardWorkDaysPerMonth"
              type="number"
              step="0.01"
              {...register("standardWorkDaysPerMonth")}
            />
            {errors.standardWorkDaysPerMonth && (
              <p className="text-sm text-destructive">{errors.standardWorkDaysPerMonth.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Allowances</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendAllowance({ label: "", amount: 0, isTaxable: true })}
              >
                <PlusIcon /> Add allowance
              </Button>
            </div>
            {allowanceFields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                e.g. Transportation, Rice, Mobile Phone — optional, added to gross pay each cutoff.
              </p>
            )}
            {allowanceFields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor={`allowances.${index}.label`}>Label</Label>
                  <Input
                    id={`allowances.${index}.label`}
                    placeholder="e.g. Transportation Allowance"
                    {...register(`allowances.${index}.label` as const)}
                  />
                  {errors.allowances?.[index]?.label && (
                    <p className="text-sm text-destructive">{errors.allowances[index]?.label?.message}</p>
                  )}
                </div>
                <div className="w-28 space-y-1">
                  <Label htmlFor={`allowances.${index}.amount`}>Amount (₱)</Label>
                  <Input
                    id={`allowances.${index}.amount`}
                    type="number"
                    step="0.01"
                    {...register(`allowances.${index}.amount` as const)}
                  />
                </div>
                <div className="flex items-center gap-1.5 pb-2">
                  <Controller
                    control={control}
                    name={`allowances.${index}.isTaxable` as const}
                    render={({ field: taxableField }) => (
                      <Switch
                        checked={taxableField.value}
                        onCheckedChange={taxableField.onChange}
                        id={`allowances.${index}.isTaxable`}
                      />
                    )}
                  />
                  <Label htmlFor={`allowances.${index}.isTaxable`} className="text-xs">
                    Taxable
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAllowance(index)}
                  aria-label="Remove allowance"
                >
                  <XIcon />
                </Button>
              </div>
            ))}
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
