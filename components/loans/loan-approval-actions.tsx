"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function LoanApprovalActions({ loanId }: { loanId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);

  async function callAction(action: "approve" | "reject", body?: unknown) {
    setBusy(true);
    const res = await fetch(`/api/loans/${loanId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);

    if (!res.ok) {
      const responseBody = await res.json().catch(() => null);
      toast.error(responseBody?.error ?? `Failed to ${action} request`);
      return;
    }

    toast.success(action === "approve" ? "Cash advance approved" : "Cash advance rejected");
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => callAction("approve")} disabled={busy}>
        Approve
      </Button>
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogTrigger render={<Button variant="outline" size="sm" disabled={busy} />}>Reject</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this cash advance request</DialogTitle>
            <DialogDescription>The employee&apos;s requested advance will not be disbursed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="rejectReason">Reason</Label>
            <Input id="rejectReason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={busy || !rejectReason}
              onClick={() => {
                callAction("reject", { reason: rejectReason });
                setRejectOpen(false);
              }}
            >
              Reject request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
