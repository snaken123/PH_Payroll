"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateMinimumWageRateSchema, UpdateMinimumWageRateInput } from "@/lib/validations/rates";
import { WageSector } from "@/lib/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface MinWageItem {
  id: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  region: string;
  sector: WageSector;
  dailyRate: number | string;
  wageOrderReference: string;
}

const SECTOR_LABELS: Record<WageSector, string> = {
  NON_AGRICULTURE: "Non-Agriculture",
  AGRICULTURE: "Agriculture",
  RETAIL_SERVICE_SMALL: "Retail / Service (Micro & Small)",
};

export function MinwageRatesTab({
  rates,
  onRefresh,
}: {
  rates: MinWageItem[];
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
  } = useForm<UpdateMinimumWageRateInput>({
    resolver: zodResolver(updateMinimumWageRateSchema),
    defaultValues: {
      effectiveFrom: new Date().toISOString().slice(0, 10),
      region: "NCR",
      sector: WageSector.NON_AGRICULTURE,
      dailyRate: 645,
      wageOrderReference: "Wage Order NCR-25",
    },
  });

  const selectedSector = watch("sector");

  async function onSubmit(data: UpdateMinimumWageRateInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/rates/minimum-wage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to update Minimum Wage rate");
      }

      toast.success("Minimum Wage rate updated");
      setOpen(false);
      reset();
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Regional Minimum Wage Rates</h2>
          <p className="text-sm text-muted-foreground">
            Regional tripartite wages and productivity board (RTWPB) daily minimum wage orders (advisory checks).
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>Add / Update Wage Order</DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Regional Minimum Wage Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="effectiveFrom">Effective From</Label>
                <Input id="effectiveFrom" type="date" {...register("effectiveFrom")} />
                {errors.effectiveFrom && (
                  <p className="text-xs text-destructive">{errors.effectiveFrom.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="region">Region Code</Label>
                  <Input id="region" placeholder="e.g. NCR, Region IV-A" {...register("region")} />
                  {errors.region && (
                    <p className="text-xs text-destructive">{errors.region.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dailyRate">Daily Rate (₱)</Label>
                  <Input
                    id="dailyRate"
                    type="number"
                    step="1"
                    {...register("dailyRate", { valueAsNumber: true })}
                  />
                  {errors.dailyRate && (
                    <p className="text-xs text-destructive">{errors.dailyRate.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="sector">Sector</Label>
                <Select value={selectedSector} onValueChange={(val) => val && setValue("sector", val as WageSector)}>
                  <SelectTrigger id="sector">
                    <SelectValue placeholder="Select sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SECTOR_LABELS).map(([sec, label]) => (
                      <SelectItem key={sec} value={sec}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="wageOrderReference">Wage Order Reference</Label>
                <Input
                  id="wageOrderReference"
                  placeholder="e.g. Wage Order No. NCR-25"
                  {...register("wageOrderReference")}
                />
                {errors.wageOrderReference && (
                  <p className="text-xs text-destructive">{errors.wageOrderReference.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Wage Order"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Regional Wage Orders</CardTitle>
          <CardDescription>
            Configured daily minimum wage thresholds per region and industry sector.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Daily Rate</TableHead>
                <TableHead>Effective From</TableHead>
                <TableHead>Wage Order Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((r) => {
                const isActive = !r.effectiveTo;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Badge variant={isActive ? "default" : "secondary"}>
                        {isActive ? "Active" : "Historical"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{r.region}</TableCell>
                    <TableCell>{SECTOR_LABELS[r.sector] ?? r.sector}</TableCell>
                    <TableCell className="font-semibold text-foreground">₱{Number(r.dailyRate).toLocaleString()}/day</TableCell>
                    <TableCell>{new Date(r.effectiveFrom).toLocaleDateString()}</TableCell>
                    <TableCell className="max-w-xs text-xs text-muted-foreground truncate" title={r.wageOrderReference}>
                      {r.wageOrderReference}
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
