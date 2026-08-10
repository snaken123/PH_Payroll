"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { addManualFinalPayLineItemSchema, AddManualFinalPayLineItemInput } from "@/lib/validations/finalpay";
import { FinalPayLineItemCategory, LineItemDirection } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export function AddManualLineItemDialog({ runId }: { runId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AddManualFinalPayLineItemInput>({
    resolver: zodResolver(addManualFinalPayLineItemSchema),
    defaultValues: {
      category: FinalPayLineItemCategory.OTHER,
      direction: LineItemDirection.EARNING,
      description: "Ex gratia / discretionary financial assistance",
      amount: 5000,
      isTaxExempt: true,
    },
  });

  const selectedDirection = watch("direction");
  const selectedCategory = watch("category");
  const isTaxExempt = watch("isTaxExempt");

  async function onSubmit(data: AddManualFinalPayLineItemInput) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/final-pay/${runId}/line-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to add line item");
      }

      toast.success("Line item added to final pay run");
      setOpen(false);
      reset();
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Add Line Item</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Manual Line Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="e.g. Discretionary assistance / Death ex gratia"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="direction">Direction</Label>
              <Select value={selectedDirection} onValueChange={(val) => val && setValue("direction", val as LineItemDirection)}>
                <SelectTrigger id="direction">
                  <SelectValue placeholder="Select direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LineItemDirection.EARNING}>Earning (+)</SelectItem>
                  <SelectItem value={LineItemDirection.DEDUCTION}>Deduction (-)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="amount">Amount (₱)</Label>
              <Input
                id="amount"
                type="number"
                step="100"
                {...register("amount", { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="category">Category</Label>
            <Select value={selectedCategory} onValueChange={(val) => val && setValue("category", val as FinalPayLineItemCategory)}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(FinalPayLineItemCategory).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="isTaxExempt"
              checked={isTaxExempt}
              onCheckedChange={(checked) => setValue("isTaxExempt", !!checked)}
            />
            <Label htmlFor="isTaxExempt" className="cursor-pointer text-sm font-normal">
              Tax-exempt item (e.g. non-taxable financial assistance / ex gratia)
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Adding..." : "Add Line Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
