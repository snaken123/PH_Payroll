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

export function RunActions({ runId, status }: { runId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voidOpen, setVoidOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);

  async function callAction(action: "approve" | "post" | "void", body?: unknown) {
    setBusy(true);
    const res = await fetch(`/api/payroll/runs/${runId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);

    if (!res.ok) {
      const responseBody = await res.json().catch(() => null);
      toast.error(responseBody?.error ?? `Failed to ${action} run`);
      return;
    }

    toast.success(`Run ${action === "approve" ? "approved" : action === "post" ? "posted" : "voided"}`);
    router.refresh();
  }

  if (status === "DRAFT") {
    return (
      <div className="flex gap-2">
        <Button onClick={() => callAction("approve")} disabled={busy}>
          Approve
        </Button>
        <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
          <DialogTrigger render={<Button variant="outline" />}>Void</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Void this run</DialogTitle>
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
                Void run
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (status === "APPROVED") {
    return (
      <Dialog open={postOpen} onOpenChange={setPostOpen}>
        <DialogTrigger render={<Button disabled={busy} />}>Post (final — locks this run)</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post this payroll run?</DialogTitle>
            <DialogDescription>
              This locks the run and its payslips permanently — no further edits or voids will be possible.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={busy}
              onClick={() => {
                callAction("post");
                setPostOpen(false);
              }}
            >
              {busy ? "Posting..." : "Post run"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
