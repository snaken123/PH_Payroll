"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createContractorPaymentSchema,
  type CreateContractorPaymentFormValues,
  type CreateContractorPaymentInput,
} from "@/lib/validations/contractor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function CreatePaymentDialog({
  contractorId,
  defaultEwtRate,
}: {
  contractorId: string;
  defaultEwtRate: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateContractorPaymentFormValues, unknown, CreateContractorPaymentInput>({
    resolver: zodResolver(createContractorPaymentSchema),
    defaultValues: { ewtRate: defaultEwtRate },
  });

  async function onSubmit(values: CreateContractorPaymentInput) {
    setSubmitting(true);
    const res = await fetch(`/api/contractors/${contractorId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error?.formErrors?.join?.(", ") ?? body?.error ?? "Failed to record payment");
      return;
    }

    toast.success("Payment recorded (draft)");
    reset({ ewtRate: defaultEwtRate });
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Record payment</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record contractor payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="paymentDate">Payment date</Label>
            <Input id="paymentDate" type="date" {...register("paymentDate")} />
            {errors.paymentDate && <p className="text-sm text-destructive">{errors.paymentDate.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="grossAmount">Gross amount (₱)</Label>
            <Input id="grossAmount" type="number" step="0.01" {...register("grossAmount")} />
            {errors.grossAmount && <p className="text-sm text-destructive">{errors.grossAmount.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="ewtRate">EWT rate (decimal)</Label>
            <Input id="ewtRate" type="number" step="0.01" {...register("ewtRate")} />
            {errors.ewtRate && <p className="text-sm text-destructive">{errors.ewtRate.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="invoiceReference">Invoice / reference # (optional)</Label>
            <Input id="invoiceReference" {...register("invoiceReference")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
