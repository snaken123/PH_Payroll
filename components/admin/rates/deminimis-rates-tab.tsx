"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateDeMinimisCeilingSchema, UpdateDeMinimisCeilingInput } from "@/lib/validations/rates";
import { DeMinimisCategory, DeMinimisFrequency } from "@/lib/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface DeMinimisItem {
  id: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  category: DeMinimisCategory;
  ceilingAmount: number | string;
  frequency: DeMinimisFrequency;
  sourceReference: string;
}

const CATEGORY_LABELS: Record<DeMinimisCategory, string> = {
  RICE_SUBSIDY: "Rice Subsidy",
  UNIFORM_CLOTHING: "Uniform & Clothing Allowance",
  MEDICAL_CASH_ALLOWANCE: "Medical Cash Allowance to Dependents",
  MEDICAL_ASSISTANCE: "Actual Medical Assistance",
  LAUNDRY: "Laundry Allowance",
  ACHIEVEMENT_AWARD: "Employee Achievement Award",
  CHRISTMAS_ANNIVERSARY_GIFT: "Christmas & Major Anniversary Gift",
  CBA_PRODUCTIVITY_INCENTIVE: "CBA & Productivity Incentive",
  MONETIZED_UNUSED_LEAVE: "Monetized Unused Vacation Leave",
  MEAL_ALLOWANCE_OT_NIGHTSHIFT: "Overtime / Nightshift Meal Allowance",
};

export function DeminimisRatesTab({
  ceilings,
  onRefresh,
}: {
  ceilings: DeMinimisItem[];
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateDeMinimisCeilingInput>({
    resolver: zodResolver(updateDeMinimisCeilingSchema),
    defaultValues: {
      effectiveFrom: new Date().toISOString().slice(0, 10),
      category: DeMinimisCategory.RICE_SUBSIDY,
      ceilingAmount: 2000,
      frequency: DeMinimisFrequency.MONTHLY,
      sourceReference: "BIR RR No. 11-2018",
    },
  });

  const selectedCategory = watch("category");
  const selectedFrequency = watch("frequency");

  async function onSubmit(data: UpdateDeMinimisCeilingInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/rates/de-minimis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to update De Minimis ceiling");
      }

      toast.success("De Minimis ceiling updated");
      setOpen(false);
      reset();
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  // Active ceilings per category
  const activeCeilings = Object.values(DeMinimisCategory).map((cat) => {
    return ceilings.find((c) => c.category === cat && !c.effectiveTo) ?? ceilings.find((c) => c.category === cat);
  }).filter(Boolean) as DeMinimisItem[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">De Minimis Benefit Tax-Exempt Ceilings</h2>
          <p className="text-sm text-muted-foreground">
            Governs statutory non-taxable allowance limits under BIR Revenue Regulations (RR 11-2018, RR 5-2011).
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>Update Category Ceiling</DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update De Minimis Category Ceiling</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="effectiveFrom">Effective From</Label>
                <Input id="effectiveFrom" type="date" {...register("effectiveFrom")} />
                {errors.effectiveFrom && (
                  <p className="text-xs text-destructive">{errors.effectiveFrom.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="category">Category</Label>
                <Select value={selectedCategory} onValueChange={(val) => val && setValue("category", val as DeMinimisCategory)}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
                      <SelectItem key={cat} value={cat}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="ceilingAmount">Ceiling Amount (₱)</Label>
                  <Input
                    id="ceilingAmount"
                    type="number"
                    step="100"
                    {...register("ceilingAmount", { valueAsNumber: true })}
                  />
                  {errors.ceilingAmount && (
                    <p className="text-xs text-destructive">{errors.ceilingAmount.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select value={selectedFrequency} onValueChange={(val) => val && setValue("frequency", val as DeMinimisFrequency)}>
                    <SelectTrigger id="frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DeMinimisFrequency.MONTHLY}>Monthly</SelectItem>
                      <SelectItem value={DeMinimisFrequency.ANNUAL}>Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="sourceReference">Source Reference</Label>
                <Input
                  id="sourceReference"
                  placeholder="e.g. BIR RR No. 11-2018"
                  {...register("sourceReference")}
                />
                {errors.sourceReference && (
                  <p className="text-xs text-destructive">{errors.sourceReference.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Ceiling Version"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active De Minimis Ceilings</CardTitle>
          <CardDescription>
            Current statutory tax-exempt caps by allowance category.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Ceiling Amount</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Effective From</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeCeilings.map((c) => {
                const isActive = !c.effectiveTo;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{CATEGORY_LABELS[c.category] ?? c.category}</TableCell>
                    <TableCell className="font-semibold text-foreground">₱{Number(c.ceilingAmount).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline">{c.frequency}</Badge></TableCell>
                    <TableCell>{new Date(c.effectiveFrom).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={isActive ? "default" : "secondary"}>
                        {isActive ? "Active" : "Historical"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs text-xs text-muted-foreground truncate" title={c.sourceReference}>
                      {c.sourceReference}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
