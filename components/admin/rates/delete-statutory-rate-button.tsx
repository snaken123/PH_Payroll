"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";

interface DeleteStatutoryRateButtonProps {
  apiEndpoint: string;
  onSuccess: () => void;
}

export function DeleteStatutoryRateButton({ apiEndpoint, onSuccess }: DeleteStatutoryRateButtonProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this statutory rate entry?")) return;
    setDeleting(true);
    try {
      const res = await fetch(apiEndpoint, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to delete rate");
      }
      toast.success("Statutory rate entry deleted");
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={deleting}
      className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
    >
      <Trash2Icon className="h-3.5 w-3.5" />
    </Button>
  );
}
