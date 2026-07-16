"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createContractorSchema,
  type CreateContractorFormValues,
  type CreateContractorInput,
} from "@/lib/validations/contractor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

export function CreateContractorDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateContractorFormValues, unknown, CreateContractorInput>({
    resolver: zodResolver(createContractorSchema),
    defaultValues: { isVatRegistered: false },
  });

  async function onSubmit(values: CreateContractorInput) {
    setSubmitting(true);
    const res = await fetch("/api/contractors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error?.formErrors?.join?.(", ") ?? body?.error ?? "Failed to add contractor");
      return;
    }

    toast.success("Contractor added");
    reset({ isVatRegistered: false });
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>New contractor</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add contractor / freelancer</DialogTitle>
          <DialogDescription>
            Subject to expanded withholding tax (2307), not payroll — never included in a PayrollRun.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="name">Name / business name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="tin">TIN</Label>
            <Input id="tin" {...register("tin")} />
            {errors.tin && <p className="text-sm text-destructive">{errors.tin.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register("address")} />
            {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="atcCode">
              ATC code / category <span className="text-muted-foreground">(e.g. WC010 - Professional fees)</span>
            </Label>
            <Input id="atcCode" {...register("atcCode")} />
            {errors.atcCode && <p className="text-sm text-destructive">{errors.atcCode.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="defaultEwtRate">
              Default EWT rate <span className="text-muted-foreground">(decimal, e.g. 0.10 for 10% — verify against current BIR RR)</span>
            </Label>
            <Input id="defaultEwtRate" type="number" step="0.01" {...register("defaultEwtRate")} />
            {errors.defaultEwtRate && (
              <p className="text-sm text-destructive">{errors.defaultEwtRate.message}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="isVatRegistered"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} id="isVatRegistered" />
              )}
            />
            <Label htmlFor="isVatRegistered">VAT-registered</Label>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Add contractor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
