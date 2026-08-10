"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updatePhilhealthConfigSchema, UpdatePhilhealthConfigInput } from "@/lib/validations/rates";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface PhilhealthConfigItem {
  id: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  premiumRate: number | string;
  eeShareRate: number | string;
  erShareRate: number | string;
  floorSalary: number | string;
  ceilingSalary: number | string;
  sourceReference: string;
}

export function PhilhealthRatesTab({
  configs,
  onRefresh,
}: {
  configs: PhilhealthConfigItem[];
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const activeConfig = configs.find((c) => !c.effectiveTo) ?? configs[0];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdatePhilhealthConfigInput>({
    resolver: zodResolver(updatePhilhealthConfigSchema),
    defaultValues: {
      effectiveFrom: new Date().toISOString().slice(0, 10),
      premiumRate: activeConfig ? Number(activeConfig.premiumRate) : 0.05,
      eeShareRate: activeConfig ? Number(activeConfig.eeShareRate) : 0.025,
      erShareRate: activeConfig ? Number(activeConfig.erShareRate) : 0.025,
      floorSalary: activeConfig ? Number(activeConfig.floorSalary) : 10000,
      ceilingSalary: activeConfig ? Number(activeConfig.ceilingSalary) : 100000,
      sourceReference: activeConfig ? activeConfig.sourceReference : "",
    },
  });

  async function onSubmit(data: UpdatePhilhealthConfigInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/rates/philhealth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to update PhilHealth rates");
      }

      toast.success("PhilHealth rate config updated");
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
          <h2 className="text-xl font-semibold">PhilHealth Premium Rate Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Governs national health insurance employee and employer share rates under RA 11223 (UHC Law).
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>Update PhilHealth Rates</DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update PhilHealth Rates</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="effectiveFrom">Effective From</Label>
                <Input id="effectiveFrom" type="date" {...register("effectiveFrom")} />
                {errors.effectiveFrom && (
                  <p className="text-xs text-destructive">{errors.effectiveFrom.message}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="premiumRate">Total Rate</Label>
                  <Input
                    id="premiumRate"
                    type="number"
                    step="0.001"
                    placeholder="0.05"
                    {...register("premiumRate", { valueAsNumber: true })}
                  />
                  {errors.premiumRate && (
                    <p className="text-xs text-destructive">{errors.premiumRate.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="eeShareRate">EE Share</Label>
                  <Input
                    id="eeShareRate"
                    type="number"
                    step="0.001"
                    placeholder="0.025"
                    {...register("eeShareRate", { valueAsNumber: true })}
                  />
                  {errors.eeShareRate && (
                    <p className="text-xs text-destructive">{errors.eeShareRate.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="erShareRate">ER Share</Label>
                  <Input
                    id="erShareRate"
                    type="number"
                    step="0.001"
                    placeholder="0.025"
                    {...register("erShareRate", { valueAsNumber: true })}
                  />
                  {errors.erShareRate && (
                    <p className="text-xs text-destructive">{errors.erShareRate.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="floorSalary">Salary Floor (₱)</Label>
                  <Input
                    id="floorSalary"
                    type="number"
                    step="100"
                    {...register("floorSalary", { valueAsNumber: true })}
                  />
                  {errors.floorSalary && (
                    <p className="text-xs text-destructive">{errors.floorSalary.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ceilingSalary">Salary Ceiling (₱)</Label>
                  <Input
                    id="ceilingSalary"
                    type="number"
                    step="1000"
                    {...register("ceilingSalary", { valueAsNumber: true })}
                  />
                  {errors.ceilingSalary && (
                    <p className="text-xs text-destructive">{errors.ceilingSalary.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="sourceReference">Issuance / Source Reference</Label>
                <Input
                  id="sourceReference"
                  placeholder="e.g. PhilHealth Circular No. 2024-0001"
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
                  {submitting ? "Saving..." : "Save Rate Version"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rate Version History</CardTitle>
          <CardDescription>
            Historical PhilHealth configurations. Updating rates creates a new version and closes the previous active version.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Effective From</TableHead>
                <TableHead>Effective To</TableHead>
                <TableHead>Total Rate</TableHead>
                <TableHead>EE / ER Split</TableHead>
                <TableHead>Salary Floor</TableHead>
                <TableHead>Salary Ceiling</TableHead>
                <TableHead>Source Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((c) => {
                const isActive = !c.effectiveTo;
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Badge variant={isActive ? "default" : "secondary"}>
                        {isActive ? "Active" : "Historical"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(c.effectiveFrom).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {c.effectiveTo ? new Date(c.effectiveTo).toLocaleDateString() : "Present"}
                    </TableCell>
                    <TableCell className="font-medium">{(Number(c.premiumRate) * 100).toFixed(2)}%</TableCell>
                    <TableCell>
                      {(Number(c.eeShareRate) * 100).toFixed(2)}% / {(Number(c.erShareRate) * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell>₱{Number(c.floorSalary).toLocaleString()}</TableCell>
                    <TableCell>₱{Number(c.ceilingSalary).toLocaleString()}</TableCell>
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
