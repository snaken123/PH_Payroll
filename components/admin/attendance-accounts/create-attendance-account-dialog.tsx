"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function CreateAttendanceAccountDialog({ companies }: { companies: CompanyOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password || !name || !companyId) {
      toast.error("Please fill out all required fields.");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/admin/attendance-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, name, companyId }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Failed to create attendance staff account.");
      return;
    }

    toast.success("Attendance staff account created!");
    setUsername("");
    setPassword("");
    setName("");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white" />}>
        <PlusIcon className="size-3.5" /> New Attendance Account
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100 dark">
        <DialogHeader>
          <DialogTitle>Create Attendance Staff Account</DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Creates standalone portal credentials for staff assigned to log attendance and leaves.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="name" className="text-xs font-semibold">Staff Name</Label>
            <Input
              id="name"
              placeholder="e.g. Maria Santos (Manila Staff)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-slate-950 border-slate-800 text-xs h-9"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="username" className="text-xs font-semibold">Portal Username</Label>
            <Input
              id="username"
              placeholder="e.g. staff_manila"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="bg-slate-950 border-slate-800 text-xs h-9 font-mono"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-slate-950 border-slate-800 text-xs h-9"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Assigned Company Scope</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
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

          <DialogFooter className="pt-2">
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
              {submitting ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
