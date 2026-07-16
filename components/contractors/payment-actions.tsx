"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export function PaymentActions({ paymentId, status }: { paymentId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voidOpen, setVoidOpen] = useState(false);

  async function callAction(action: "post" | "void", body?: unknown) {
    setBusy(true);
    const res = await fetch(`/api/contractor-payments/${paymentId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);

    if (!res.ok) {
      const responseBody = await res.json().catch(() => null);
      toast.error(responseBody?.error ?? `Failed to ${action} payment`);
      return;
    }

    toast.success(action === "post" ? "Payment posted" : "Payment voided");
    router.refresh();
  }

  if (status !== "DRAFT") return null;

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => callAction("post")} disabled={busy}>
        Post
      </Button>
      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogTrigger render={<Button size="sm" variant="outline" />}>Void</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void this payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="voidReason">Reason</Label>
            <Input id="voidReason" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={busy || !voidReason}
              onClick={() => {
                callAction("void", { reason: voidReason });
                setVoidOpen(false);
              }}
            >
              Void payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
