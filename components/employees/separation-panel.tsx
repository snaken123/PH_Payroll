"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ClearanceToggle({ employeeId, clearanceCompleted }: { employeeId: string; clearanceCompleted: boolean }) {
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
      <Switch id="clearance" checked={clearanceCompleted} onCheckedChange={toggle} disabled={busy} />
      <Label htmlFor="clearance">Clearance completed</Label>
    </div>
  );
}

export function ComputeFinalPayButton({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function compute() {
    setBusy(true);
    const res = await fetch(`/api/employees/${employeeId}/final-pay`, { method: "POST" });
    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Failed to compute final pay");
      return;
    }

    const { finalPayRunId } = await res.json();
    toast.success("Final pay computed");
    router.push(`/dashboard/employees/${employeeId}/final-pay/${finalPayRunId}`);
  }

  return (
    <Button onClick={compute} disabled={busy}>
      {busy ? "Computing..." : "Compute final pay"}
    </Button>
  );
}
