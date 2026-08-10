"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateThirteenthMonthConfigSchema, UpdateThirteenthMonthConfigInput } from "@/lib/validations/rates";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ThirteenthMonthConfigItem {
  id: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  exemptionCeiling: number | string;
  sourceReference: string;
}

export function ThirteenthMonthRatesTab({
  configs,
  onRefresh,
}: {
  configs: ThirteenthMonthConfigItem[];
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
  } = useForm<UpdateThirteenthMonthConfigInput>({
    resolver: zodResolver(updateThirteenthMonthConfigSchema),
    defaultValues: {
      effectiveFrom: new Date().toISOString().slice(0, 10),
      exemptionCeiling: activeConfig ? Number(activeConfig.exemptionCeiling) : 90000,
      sourceReference: activeConfig ? activeConfig.sourceReference : "TRAIN law amendment to NIRC Sec. 32(B)(7)(e)",
    },
  });

  async function onSubmit(data: UpdateThirteenthMonthConfigInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/rates/thirteenth-month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to update 13th Month exemption ceiling");
      }

      toast.success("13th Month Pay exemption ceiling updated");
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
          <h2 className="text-xl font-semibold">13th Month & Other Benefits Exemption Ceiling</h2>
          <p className="text-sm text-muted-foreground">
            Combined statutory tax-exempt exclusion ceiling under NIRC Sec. 32(B)(7)(e) as amended by TRAIN Law (RA 10963).
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>Update Exemption Ceiling</DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update 13th Month Exemption Ceiling</DialogTitle>
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
                <Label htmlFor="exemptionCeiling">Combined Exemption Ceiling (₱)</Label>
                <Input
                  id="exemptionCeiling"
                  type="number"
                  step="1000"
                  {...register("exemptionCeiling", { valueAsNumber: true })}
                />
                {errors.exemptionCeiling && (
                  <p className="text-xs text-destructive">{errors.exemptionCeiling.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="sourceReference">Source Reference</Label>
                <Input
                  id="sourceReference"
                  placeholder="e.g. TRAIN Law RA 10963"
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
                  {submitting ? "Saving..." : "Save Config Version"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>13th Month Exemption History</CardTitle>
          <CardDescription>
            Historical statutory exemption caps applied to 13th month pay and other benefits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Effective From</TableHead>
                <TableHead>Effective To</TableHead>
                <TableHead>Exemption Ceiling</TableHead>
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
                    <TableCell className="font-semibold text-foreground">
                      ₱{Number(c.exemptionCeiling).toLocaleString()}
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
