"use client";

import { useState } from "react";
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

interface Balance {
  id: string;
  entitledDays: string;
  usedDays: string;
  carriedOverDays: string;
  adjustedDays: string;
  leaveType: { id: string; name: string };
}

export function AdjustLeaveBalanceDialog({
  balance,
  onUpdated,
}: {
  balance: Balance;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [entitledDays, setEntitledDays] = useState(balance.entitledDays);
  const [adjustedDays, setAdjustedDays] = useState(balance.adjustedDays);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/leave/balances", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          balanceId: balance.id,
          entitledDays: Number(entitledDays),
          adjustedDays: Number(adjustedDays),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error ?? "Failed to update leave balance");
        return;
      }

      toast.success("Leave balance updated");
      setOpen(false);
      onUpdated();
    } catch {
      toast.error("Network error while updating balance");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Adjust
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust {balance.leaveType.name} balance</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="entitledDays">Entitled days</Label>
            <Input
              id="entitledDays"
              type="number"
              step="0.5"
              min="0"
              value={entitledDays}
              onChange={(e) => setEntitledDays(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Base annual entitlement grant for this leave type.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="adjustedDays">Adjusted days</Label>
            <Input
              id="adjustedDays"
              type="number"
              step="0.5"
              value={adjustedDays}
              onChange={(e) => setAdjustedDays(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Manual correction or discretionary addition/subtraction.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
