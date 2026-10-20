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

import { CreditCard } from "lucide-react";

export function FinalPayActions({
  runId,
  status,
  clearanceCompleted,
  netFinalPay,
  employeeName,
}: {
  runId: string;
  status: string;
  clearanceCompleted: boolean;
  netFinalPay?: number;
  employeeName?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voidOpen, setVoidOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);

  // Check details for post modal
  const [postCheckNumber, setPostCheckNumber] = useState("");
  const [postCheckDate, setPostCheckDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [postBankName, setPostBankName] = useState("");
  const [postPayee, setPostPayee] = useState(employeeName || "");
  const [postAmount, setPostAmount] = useState(netFinalPay !== undefined ? String(netFinalPay) : "");

  async function callAction(action: "approve" | "post" | "void", body?: unknown) {
    setBusy(true);
    const res = await fetch(`/api/final-pay/${runId}/${action}`, {
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

    toast.success(`Final pay ${action === "approve" ? "approved" : action === "post" ? "posted" : "voided"}`);
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
              <DialogTitle>Void this final pay run</DialogTitle>
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
      <div className="flex flex-col items-end gap-1">
        <Dialog open={postOpen} onOpenChange={setPostOpen}>
          <DialogTrigger render={<Button disabled={busy || !clearanceCompleted} />}>
            Post (final — locks this run)
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                Post this final pay run?
              </DialogTitle>
              <DialogDescription className="text-xs">
                This locks the run permanently and settles the employee&apos;s outstanding loans against it. This
                cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs border-y border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                <CreditCard className="size-3.5 text-blue-600" />
                <span>Disbursement Check Details (Optional)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                You can record the payment check number now, or skip this and enter/edit it later in the <strong>Check Register</strong>.
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Check Number
                  </Label>
                  <Input
                    placeholder="e.g. 0089201"
                    className="h-8 text-xs font-mono font-bold"
                    value={postCheckNumber}
                    onChange={(e) => setPostCheckNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Check Date
                  </Label>
                  <Input
                    type="date"
                    className="h-8 text-xs font-mono"
                    value={postCheckDate}
                    onChange={(e) => setPostCheckDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Payee
                  </Label>
                  <Input
                    placeholder="Payee name"
                    className="h-8 text-xs"
                    value={postPayee}
                    onChange={(e) => setPostPayee(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Disbursing Bank / Account
                  </Label>
                  <Input
                    placeholder="e.g. BDO Current #00129"
                    className="h-8 text-xs"
                    value={postBankName}
                    onChange={(e) => setPostBankName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Amount (₱)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  className="h-8 text-xs font-mono font-bold"
                  value={postAmount}
                  onChange={(e) => setPostAmount(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" onClick={() => setPostOpen(false)} disabled={busy} className="text-xs">
                Cancel
              </Button>
              <Button
                disabled={busy}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
                onClick={() => {
                  callAction("post", {
                    checkNumber: postCheckNumber.trim() || undefined,
                    checkDate: postCheckDate || undefined,
                    bankName: postBankName.trim() || undefined,
                    payee: postPayee.trim() || undefined,
                    amount: postAmount ? Number(postAmount) : undefined,
                  });
                  setPostOpen(false);
                }}
              >
                {busy ? "Posting..." : "Confirm & Post Run"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {!clearanceCompleted && (
          <p className="text-xs text-muted-foreground">Requires clearance to be marked complete first.</p>
        )}
      </div>
    );
  }

  return null;
}
