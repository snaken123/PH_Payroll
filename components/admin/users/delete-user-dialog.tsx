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
import { Trash2Icon, AlertTriangleIcon } from "lucide-react";

interface DeleteUserDialogProps {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

export function DeleteUserDialog({ user }: DeleteUserDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    setSubmitting(true);

    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "DELETE",
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Failed to delete user account");
      return;
    }

    toast.success(`User account ${user.email} successfully deleted`);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-rose-900/60 bg-rose-950/30 text-rose-300 hover:bg-rose-900/60 hover:text-white"
          >
            <Trash2Icon className="size-3 mr-1 text-rose-400" /> Delete
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100 dark">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-400">
            <AlertTriangleIcon className="size-4 text-rose-400" /> Delete User Account
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Are you sure you want to permanently delete this platform user account? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 rounded-lg border border-rose-900/40 bg-rose-950/20 text-xs text-slate-300 space-y-1">
          <p>
            <span className="font-semibold text-white">Name:</span> {user.name || "—"}
          </p>
          <p>
            <span className="font-semibold text-white">Email / Username:</span> {user.email}
          </p>
        </div>

        <DialogFooter className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            className="text-xs border-slate-700 text-slate-300"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={handleDelete}
            className="bg-rose-600 hover:bg-rose-500 text-xs font-semibold px-4 text-white"
          >
            {submitting ? "Deleting..." : "Permanently Delete User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
