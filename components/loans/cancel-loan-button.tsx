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

export function CancelLoanButton({ loanId }: { loanId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function cancel() {
    setBusy(true);
    const res = await fetch(`/api/loans/${loanId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Failed to cancel loan");
      return;
    }

    toast.success("Loan cancelled");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>Cancel</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this loan?</DialogTitle>
          <DialogDescription>
            This stops future deductions for this loan. This cannot be undone from here.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="destructive" onClick={cancel} disabled={busy}>
            {busy ? "Cancelling..." : "Cancel loan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
