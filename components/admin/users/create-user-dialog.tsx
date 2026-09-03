"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, platformRoleValues, companyRoleValues, type CreateUserFormValues, type CreateUserInput } from "@/lib/validations/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlusIcon, KeyIcon } from "lucide-react";

interface CompanyOption {
  id: string;
  legalName: string;
}

export function CreateUserDialog({ companies = [] }: { companies?: CompanyOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormValues, unknown, CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      platformRole: "STANDARD",
    },
  });

  async function onSubmit(values: CreateUserInput) {
    setSubmitting(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Failed to create user");
      return;
    }

    toast.success("User account created successfully");
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs gap-1.5 shadow-xs">
            <UserPlusIcon className="size-3.5" /> Add New User
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100 dark">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-100">
            <KeyIcon className="size-4 text-blue-400" /> Create Platform User
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Add a new platform account with login credentials and access privileges.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-medium text-slate-300">
              Full Name
            </Label>
            <Input
              id="name"
              placeholder="e.g. Maria Santos"
              className="bg-slate-950 border-slate-800 text-xs h-9 text-slate-100"
              {...register("name")}
            />
            {errors.name && <p className="text-[11px] text-rose-400 font-medium">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-slate-300">
              Email Address / Username
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="user@company.com"
              className="bg-slate-950 border-slate-800 text-xs h-9 text-slate-100"
              {...register("email")}
            />
            {errors.email && <p className="text-[11px] text-rose-400 font-medium">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-slate-300">
              Initial Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••••••"
              className="bg-slate-950 border-slate-800 text-xs h-9 text-slate-100"
              {...register("password")}
            />
            {errors.password && <p className="text-[11px] text-rose-400 font-medium">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-300">Platform Role</Label>
            <Controller
              control={control}
              name="platformRole"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-xs h-9 text-slate-100">
                    <SelectValue placeholder="Select platform role" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                    {platformRoleValues.map((role) => (
                      <SelectItem key={role} value={role} className="text-xs">
                        {role === "SUPER_ADMIN" ? "SUPER_ADMIN (Full Platform Access)" : "STANDARD (Tenant Level)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {companies.length > 0 && (
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Optional: Initial Company Membership
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">Company</Label>
                  <Controller
                    control={control}
                    name="companyId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-xs h-8 text-slate-100">
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                          {companies.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {c.legalName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">Company Role</Label>
                  <Controller
                    control={control}
                    name="companyRole"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-xs h-8 text-slate-100">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                          {companyRoleValues.map((role) => (
                            <SelectItem key={role} value={role} className="text-xs">
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-500 text-xs font-semibold">
              {submitting ? "Creating User..." : "Create User Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
