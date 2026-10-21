"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { LandmarkIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

interface RemittanceOfficerToggleProps {
  userId: string;
  userName: string;
  initialChecked: boolean;
  isSuperAdmin?: boolean;
}

export function RemittanceOfficerToggle({
  userId,
  userName,
  initialChecked,
  isSuperAdmin = false,
}: RemittanceOfficerToggleProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(initialChecked);
  const [loading, setLoading] = useState(false);

  if (isSuperAdmin) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-amber-400/80 font-mono">
        <LandmarkIcon className="size-3 text-amber-400" />
        <span>Full Access (Super Admin)</span>
      </div>
    );
  }

  const handleToggle = async (nextVal: boolean) => {
    if (loading) return;
    const previous = checked;
    setChecked(nextVal);
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}/remittance-officer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRemittanceOfficer: nextVal }),
      });

      if (!res.ok) {
        throw new Error("Failed to update remittance officer status");
      }

      if (nextVal) {
        toast.success(`Assigned ${userName} as Remittance Officer`, {
          description: "This user can now sign in and access the Statutory Remittance Portal to process checks.",
        });
      } else {
        toast.info(`Removed Remittance Officer status from ${userName}`);
      }

      router.refresh();
    } catch {
      setChecked(previous);
      toast.error("Failed to update remittance officer assignment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 mt-0.5">
      <label
        htmlFor={`remit-toggle-${userId}`}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer select-none border ${
          checked
            ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/20"
            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
        }`}
      >
        {loading ? (
          <Loader2Icon className="size-3 animate-spin text-emerald-400" />
        ) : (
          <Checkbox
            id={`remit-toggle-${userId}`}
            checked={checked}
            disabled={loading}
            onCheckedChange={(val) => handleToggle(Boolean(val))}
            className="size-3.5 border-slate-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
          />
        )}
        <LandmarkIcon className={`size-3 ${checked ? "text-emerald-400" : "text-slate-500"}`} />
        <span>Remittance Officer</span>
      </label>
    </div>
  );
}
