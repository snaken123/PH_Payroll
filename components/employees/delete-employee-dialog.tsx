"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2Icon, AlertTriangleIcon, ShieldAlertIcon } from "lucide-react";

const PRESET_REASONS = [
  "Created by mistake / Duplicate entry",
  "Incorrect employee details / Invalid setup",
  "Test employee profile",
  "Employee never reported for work",
  "Custom reason (type below)",
];

interface DeleteEmployeeDialogProps {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  redirectOnSuccess?: boolean;
  trigger?: React.ReactNode;
}

export function DeleteEmployeeDialog({
  employeeId,
  employeeName,
  employeeNumber,
  redirectOnSuccess = false,
  trigger,
}: DeleteEmployeeDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [presetReason, setPresetReason] = useState<string>(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const finalReason = presetReason === "Custom reason (type below)" ? customReason.trim() : presetReason;

  async function handleDelete() {
    if (!finalReason || finalReason.length < 3) {
      toast.error("Please specify a valid reason for deleting this employee (at least 3 characters).");
      return;
    }

    setSubmitting(true);
    const res = await fetch(`/api/employees/${employeeId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: finalReason }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Failed to delete employee");
      return;
    }

    toast.success(`Employee ${employeeName} has been deleted and logged to the audit trail.`);
    setOpen(false);

    if (redirectOnSuccess) {
      router.push("/dashboard/employees");
    } else {
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            trigger as React.ReactElement
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40">
              <Trash2Icon className="size-3.5 text-rose-600" /> Delete Employee
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <Trash2Icon className="size-4 text-rose-600" /> Delete Employee Profile
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Are you sure you want to delete <strong className="text-slate-900 dark:text-slate-100">{employeeName}</strong> ({employeeNumber})?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Warning Banner */}
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 flex items-start gap-2.5">
            <AlertTriangleIcon className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold uppercase tracking-wider block">Audit Trail Notice</strong>
              This action will soft-delete the employee profile and record an entry in the mandatory deletion audit log (including your username, date, and reason).
            </div>
          </div>

          {/* Preset Reason Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Reason for Deletion <span className="text-rose-500">*</span>
            </Label>
            <Select value={presetReason} onValueChange={(val) => setPresetReason(val ?? PRESET_REASONS[0])}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {PRESET_REASONS.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Textarea if selected or additional details */}
          {(presetReason === "Custom reason (type below)" || customReason.length > 0) && (
            <div className="space-y-1.5">
              <Label htmlFor="customReason" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Detailed Reason / Notes
              </Label>
              <Textarea
                id="customReason"
                placeholder="Explain why this employee profile is being deleted..."
                value={customReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomReason(e.target.value)}
                className="text-xs resize-none h-20"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={submitting} className="text-xs">
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={submitting || finalReason.length < 3}
            className="text-xs font-semibold gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
          >
            <Trash2Icon className="size-3.5" />
            {submitting ? "Deleting Profile..." : "Confirm & Delete Employee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
