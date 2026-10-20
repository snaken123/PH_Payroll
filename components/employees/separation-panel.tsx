"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ClearanceToggle({
  employeeId,
  clearanceCompleted,
  disabled,
}: {
  employeeId: string;
  clearanceCompleted: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle(checked: boolean) {
    setBusy(true);
    const res = await fetch(`/api/employees/${employeeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearanceCompleted: checked }),
    });
    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Failed to update clearance status");
      return;
    }

    toast.success(checked ? "Clearance marked complete" : "Clearance marked incomplete");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Switch id="clearance" checked={clearanceCompleted} onCheckedChange={toggle} disabled={busy || disabled} />
      <Label htmlFor="clearance">Clearance completed</Label>
    </div>
  );
}

import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CalendarIcon, CalculatorIcon } from "lucide-react";

export function ComputeFinalPayButton({
  employeeId,
  defaultSeparationDate,
  disabled,
}: {
  employeeId: string;
  defaultSeparationDate?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"AUTO" | "MANUAL">("AUTO");
  const [inclusiveStartDate, setInclusiveStartDate] = useState("");
  const [inclusiveEndDate, setInclusiveEndDate] = useState(defaultSeparationDate || "");
  const [payableDays, setPayableDays] = useState("");

  async function compute() {
    setBusy(true);
    const payload =
      mode === "AUTO"
        ? { calculationMode: "AUTO" }
        : {
            calculationMode: "MANUAL_DAYS",
            inclusiveStartDate: inclusiveStartDate || undefined,
            inclusiveEndDate: inclusiveEndDate || undefined,
            payableDays: payableDays ? Number(payableDays) : undefined,
          };

    const res = await fetch(`/api/employees/${employeeId}/final-pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Failed to compute final pay");
      return;
    }

    const { finalPayRunId } = await res.json();
    toast.success("Final pay computed successfully");
    setOpen(false);
    router.push(`/dashboard/employees/${employeeId}/final-pay/${finalPayRunId}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button disabled={busy || disabled} />}>
        Compute final pay
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <CalculatorIcon className="size-4 text-blue-600" />
            Compute Final Pay &amp; Separation
          </DialogTitle>
          <DialogDescription className="text-xs">
            Choose how to compute unpaid basic wages for the employee&apos;s final pay calculation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Mode Selection */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("AUTO")}
              className={`p-3 rounded-lg border text-left transition-all ${
                mode === "AUTO"
                  ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-1 ring-blue-600"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
              }`}
            >
              <div className="font-semibold text-xs flex items-center gap-1.5">
                <CalendarIcon className="size-3.5 text-blue-600" />
                Automatic
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Reads all unposted attendance timesheets up to separation date.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode("MANUAL")}
              className={`p-3 rounded-lg border text-left transition-all ${
                mode === "MANUAL"
                  ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-1 ring-blue-600"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
              }`}
            >
              <div className="font-semibold text-xs flex items-center gap-1.5">
                <CalculatorIcon className="size-3.5 text-blue-600" />
                Inclusive Days / Range
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Enter cutoff date range or payable days to avoid adding missed payrolls.
              </p>
            </button>
          </div>

          {mode === "MANUAL" && (
            <div className="space-y-3 p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Inclusive Start Date
                  </Label>
                  <Input
                    type="date"
                    value={inclusiveStartDate}
                    onChange={(e) => setInclusiveStartDate(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Inclusive End Date
                  </Label>
                  <Input
                    type="date"
                    value={inclusiveEndDate}
                    onChange={(e) => setInclusiveEndDate(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Payable Days (Optional override)
                </Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="e.g. 8 (direct daily rate × days calculation)"
                  value={payableDays}
                  onChange={(e) => setPayableDays(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
                <p className="text-[10px] text-slate-500">
                  If payable days is entered, base pay is computed directly as daily rate × payable days, isolating this final pay from previous missed runs.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy} className="text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={compute}
            disabled={busy}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
          >
            {busy ? "Computing..." : "Compute Final Pay"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
