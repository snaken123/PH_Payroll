"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function DeleteLineItemButton({
  runId,
  lineItemId,
}: {
  runId: string;
  lineItemId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Are you sure you want to remove this line item?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/final-pay/${runId}/line-items/${lineItemId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error ?? "Failed to delete line item");
        return;
      }

      toast.success("Line item removed");
      router.refresh();
    } catch {
      toast.error("Network error while deleting line item");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
      disabled={loading}
      onClick={handleDelete}
      title="Remove line item"
    >
      <Trash2 className="h-4 w-4" />
      <span className="sr-only">Delete</span>
    </Button>
  );
}
