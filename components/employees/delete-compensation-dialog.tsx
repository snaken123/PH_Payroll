"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { Trash2Icon } from "lucide-react";

interface DeleteCompensationDialogProps {
  employeeId: string;
  recordId: string;
  effectiveFrom: string;
  basicRate: number;
}

export function DeleteCompensationDialog({
  employeeId,
  recordId,
  effectiveFrom,
  basicRate,
}: DeleteCompensationDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}/compensation/${recordId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to delete compensation rate");
      }

      toast.success("Compensation rate record deleted");
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
            <Trash2Icon className="h-3.5 w-3.5" />
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2">
            <Trash2Icon className="h-5 w-5" /> Delete Compensation Rate
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this rate record?
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-md space-y-1 text-xs font-mono border border-slate-200 dark:border-slate-800">
            <div><span className="font-semibold text-slate-500">Effective From:</span> {effectiveFrom}</div>
            <div><span className="font-semibold text-slate-500">Basic Rate:</span> ₱{basicRate.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Deleting this record will adjust the surrounding effective date history so that payroll calculations remain contiguous.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
            {submitting ? "Deleting..." : "Delete Rate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
