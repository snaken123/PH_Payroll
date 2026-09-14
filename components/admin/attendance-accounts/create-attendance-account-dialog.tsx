"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, Building2Icon, CheckSquareIcon, SquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>(
    companies.length > 0 ? [companies[0].id] : []
  );

  function handleToggleCompany(id: string, checked: boolean) {
    if (checked) {
      setSelectedCompanyIds((prev) => [...prev, id]);
    } else {
      setSelectedCompanyIds((prev) => prev.filter((cId) => cId !== id));
    }
  }

  function handleSelectAll() {
    if (selectedCompanyIds.length === companies.length) {
      setSelectedCompanyIds([]);
    } else {
      setSelectedCompanyIds(companies.map((c) => c.id));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password || !name || selectedCompanyIds.length === 0) {
      toast.error("Please fill out all fields and select at least one company.");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/admin/attendance-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, name, companyIds: selectedCompanyIds }),
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

  const allSelected = companies.length > 0 && selectedCompanyIds.length === companies.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white" />}>
        <PlusIcon className="size-3.5" /> New Attendance Account
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100 dark">
        <DialogHeader>
          <DialogTitle>Create Attendance Staff Account</DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Creates portal credentials for attendance staff. Select all companies this checker is responsible for.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="name" className="text-xs font-semibold">Staff Name</Label>
            <Input
              id="name"
              placeholder="e.g. Attendance Checker"
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
              placeholder="e.g. attendance"
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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Building2Icon className="size-3.5 text-blue-400" />
                Assigned Company Scope ({selectedCompanyIds.length} selected)
              </Label>
              {companies.length > 1 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                >
                  {allSelected ? <CheckSquareIcon className="size-3" /> : <SquareIcon className="size-3" />}
                  {allSelected ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-md p-2.5 max-h-44 overflow-y-auto space-y-2">
              {companies.map((c) => {
                const checked = selectedCompanyIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer select-none hover:bg-slate-900 p-1.5 rounded transition-colors"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(isCheck) => handleToggleCompany(c.id, !!isCheck)}
                      className="border-slate-700 data-[state=checked]:bg-blue-600"
                    />
                    <span className="truncate flex-1 font-medium">{c.legalName}</span>
                    {c.companyCode && (
                      <span className="text-[10px] text-slate-500 font-mono">({c.companyCode})</span>
                    )}
                  </label>
                );
              })}
            </div>
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

