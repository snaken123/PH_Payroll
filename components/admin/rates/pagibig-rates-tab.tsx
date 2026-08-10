"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updatePagibigBracketSchema, UpdatePagibigBracketInput } from "@/lib/validations/rates";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface PagibigConfigItem {
  id: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  salaryThreshold: number | string;
  eeRateBelowThreshold: number | string;
  erRateBelowThreshold: number | string;
  eeRateAboveThreshold: number | string;
  erRateAboveThreshold: number | string;
  maxFundSalary: number | string;
  eeCap: number | string;
  erCap: number | string;
  sourceReference: string;
}

export function PagibigRatesTab({
  configs,
  onRefresh,
}: {
  configs: PagibigConfigItem[];
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
  } = useForm<UpdatePagibigBracketInput>({
    resolver: zodResolver(updatePagibigBracketSchema),
    defaultValues: {
      effectiveFrom: new Date().toISOString().slice(0, 10),
      salaryThreshold: activeConfig ? Number(activeConfig.salaryThreshold) : 1500,
      eeRateBelowThreshold: activeConfig ? Number(activeConfig.eeRateBelowThreshold) : 0.01,
      erRateBelowThreshold: activeConfig ? Number(activeConfig.erRateBelowThreshold) : 0.02,
      eeRateAboveThreshold: activeConfig ? Number(activeConfig.eeRateAboveThreshold) : 0.02,
      erRateAboveThreshold: activeConfig ? Number(activeConfig.erRateAboveThreshold) : 0.02,
      maxFundSalary: activeConfig ? Number(activeConfig.maxFundSalary) : 10000,
      eeCap: activeConfig ? Number(activeConfig.eeCap) : 200,
      erCap: activeConfig ? Number(activeConfig.erCap) : 200,
      sourceReference: activeConfig ? activeConfig.sourceReference : "",
    },
  });

  async function onSubmit(data: UpdatePagibigBracketInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/rates/pagibig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to update Pag-IBIG rates");
      }

      toast.success("Pag-IBIG rate config updated");
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
          <h2 className="text-xl font-semibold">Pag-IBIG (HDMF) Contribution Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Governs Home Development Mutual Fund contributions under HDMF Circular No. 460.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>Update Pag-IBIG Rates</DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update Pag-IBIG Rates</DialogTitle>
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
                  <Label htmlFor="salaryThreshold">Salary Threshold (₱)</Label>
                  <Input
                    id="salaryThreshold"
                    type="number"
                    step="100"
                    {...register("salaryThreshold", { valueAsNumber: true })}
                  />
                  {errors.salaryThreshold && (
                    <p className="text-xs text-destructive">{errors.salaryThreshold.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="maxFundSalary">Max Fund Salary (₱)</Label>
                  <Input
                    id="maxFundSalary"
                    type="number"
                    step="500"
                    {...register("maxFundSalary", { valueAsNumber: true })}
                  />
                  {errors.maxFundSalary && (
                    <p className="text-xs text-destructive">{errors.maxFundSalary.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="eeRateBelowThreshold">EE Rate (&le; Threshold)</Label>
                  <Input
                    id="eeRateBelowThreshold"
                    type="number"
                    step="0.005"
                    {...register("eeRateBelowThreshold", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="eeRateAboveThreshold">EE Rate (&gt; Threshold)</Label>
                  <Input
                    id="eeRateAboveThreshold"
                    type="number"
                    step="0.005"
                    {...register("eeRateAboveThreshold", { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="eeCap">EE Monthly Cap (₱)</Label>
                  <Input
                    id="eeCap"
                    type="number"
                    step="10"
                    {...register("eeCap", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="erCap">ER Monthly Cap (₱)</Label>
                  <Input
                    id="erCap"
                    type="number"
                    step="10"
                    {...register("erCap", { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="sourceReference">Source Reference</Label>
                <Input
                  id="sourceReference"
                  placeholder="e.g. HDMF Circular No. 460"
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
          <CardTitle>Pag-IBIG Rate Versions</CardTitle>
          <CardDescription>
            Historical Pag-IBIG maximum fund salary limits and contribution ceilings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Effective From</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>EE Rate (&le;/&gt;)</TableHead>
                <TableHead>ER Rate (&le;/&gt;)</TableHead>
                <TableHead>Max Fund Salary</TableHead>
                <TableHead>EE / ER Cap</TableHead>
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
                    <TableCell>₱{Number(c.salaryThreshold).toLocaleString()}</TableCell>
                    <TableCell>
                      {(Number(c.eeRateBelowThreshold) * 100).toFixed(1)}% / {(Number(c.eeRateAboveThreshold) * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      {(Number(c.erRateBelowThreshold) * 100).toFixed(1)}% / {(Number(c.erRateAboveThreshold) * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="font-medium">₱{Number(c.maxFundSalary).toLocaleString()}</TableCell>
                    <TableCell>
                      ₱{Number(c.eeCap).toLocaleString()} / ₱{Number(c.erCap).toLocaleString()}
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
