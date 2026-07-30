"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  markSeparatedSchema,
  separationCategoryValues,
  type MarkSeparatedFormValues,
  type MarkSeparatedInput,
} from "@/lib/validations/employee";
import { toast } from "sonner";

// EmploymentStatus has no generic "SEPARATED" value — map to the closest
// legal-status bucket so existing employment-status-driven logic elsewhere
// (e.g. active-employee filters) still treats this person as separated.
const EMPLOYMENT_STATUS_BY_CATEGORY: Record<(typeof separationCategoryValues)[number], string> = {
  RESIGNATION: "RESIGNED",
  TERMINATION_FOR_CAUSE: "TERMINATED",
  AUTHORIZED_CAUSE_REDUNDANCY: "TERMINATED",
  AUTHORIZED_CAUSE_RETRENCHMENT: "TERMINATED",
  AUTHORIZED_CAUSE_DISEASE: "TERMINATED",
  RETIREMENT: "RETIRED",
  DEATH: "TERMINATED",
  END_OF_CONTRACT: "TERMINATED",
};

export function MarkSeparatedDialog({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<MarkSeparatedFormValues, unknown, MarkSeparatedInput>({
    resolver: zodResolver(markSeparatedSchema),
    defaultValues: { separationCategory: "RESIGNATION" },
  });

  async function onSubmit(values: MarkSeparatedInput) {
    setSubmitting(true);
    const res = await fetch(`/api/employees/${employeeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dateSeparated: values.dateSeparated,
        separationCategory: values.separationCategory,
        separationReason: values.separationReason,
        employmentStatus: EMPLOYMENT_STATUS_BY_CATEGORY[values.separationCategory],
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error?.formErrors?.join?.(", ") ?? body?.error ?? "Failed to mark employee as separated");
      return;
    }

    toast.success("Employee marked as separated");
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Mark as separated</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark employee as separated</DialogTitle>
          <DialogDescription>
            Sets the separation date and category that final pay eligibility and tax treatment are computed from.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="dateSeparated">Separation date</Label>
            <Input id="dateSeparated" type="date" required {...register("dateSeparated")} />
            {errors.dateSeparated && <p className="text-sm text-destructive">{errors.dateSeparated.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="separationCategory">Separation category</Label>
            <Controller
              control={control}
              name="separationCategory"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="separationCategory">
                    <SelectValue>{(value: string) => value.replaceAll("_", " ")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {separationCategoryValues.map((v) => (
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
            <Label htmlFor="separationReason">Notes (optional)</Label>
            <Input id="separationReason" {...register("separationReason")} />
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
