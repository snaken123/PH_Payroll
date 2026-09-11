"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3Icon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface CompanyOption {
  id: string;
  legalName: string;
  companyCode?: string;
}

interface AccountItem {
  id: string;
  username: string;
  name: string;
  companyId: string;
  isActive: boolean;
}

export function EditAttendanceAccountDialog({
  account,
  companies,
}: {
  account: AccountItem;
  companies: CompanyOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [username, setUsername] = useState(account.username);
  const [password, setPassword] = useState("");
  const [name, setName] = useState(account.name);
  const [companyId, setCompanyId] = useState(account.companyId);
  const [isActive, setIsActive] = useState(account.isActive);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      username,
      name,
      companyId,
      isActive,
    };
    if (password) payload.password = password;

    const res = await fetch(`/api/admin/attendance-accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Failed to update attendance account.");
      return;
    }

    toast.success("Attendance staff account updated!");
    setPassword("");
    setOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Delete attendance account "${account.username}"?`)) return;

    setSubmitting(true);
    const res = await fetch(`/api/admin/attendance-accounts/${account.id}`, {
      method: "DELETE",
    });
    setSubmitting(false);

    if (!res.ok) {
      toast.error("Failed to delete account");
      return;
    }

    toast.success("Account deleted");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-slate-800 text-slate-300 hover:bg-slate-800" />}>
        <Edit3Icon className="size-3 text-blue-400" /> Edit
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100 dark">
        <DialogHeader>
          <DialogTitle>Edit Attendance Staff Account</DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Update credentials, reset password, or change assigned company scope.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="edit_name" className="text-xs font-semibold">Staff Name</Label>
            <Input
              id="edit_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-slate-950 border-slate-800 text-xs h-9"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit_username" className="text-xs font-semibold">Portal Username</Label>
            <Input
              id="edit_username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="bg-slate-950 border-slate-800 text-xs h-9 font-mono"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit_password" className="text-xs font-semibold">
              New Password <span className="text-slate-500 font-normal">(Leave blank to keep current)</span>
            </Label>
            <Input
              id="edit_password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-950 border-slate-800 text-xs h-9"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Assigned Company Scope</Label>
            <Select value={companyId} onValueChange={(val) => setCompanyId(val ?? "")}>
              <SelectTrigger className="bg-slate-950 border-slate-800 text-xs h-9">
                <SelectValue placeholder="Select company">
                  {(val: string) => companies.find((c) => c.id === val)?.legalName ?? "Select company"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.legalName} ({c.companyCode || "Company"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <Label className="text-xs font-semibold">Account Active Status</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={submitting}
              className="gap-1 text-xs"
            >
              <Trash2Icon className="size-3.5" /> Delete
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                className="border-slate-800 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
              >
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
