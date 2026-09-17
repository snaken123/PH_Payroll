"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createUserSchema,
  type CreateUserFormValues,
  type CreateUserInput,
} from "@/lib/validations/user";
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
import { UserPlusIcon, KeyIcon } from "lucide-react";
import { AccessTree, type CompanyOption, type AccessTreeMembership } from "./access-tree";

export function CreateUserDialog({ companies = [] }: { companies?: CompanyOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [platformRole, setPlatformRole] = useState<"STANDARD" | "SUPER_ADMIN">("STANDARD");
  const [memberships, setMemberships] = useState<AccessTreeMembership[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateUserFormValues, unknown, CreateUserInput>({
    resolver: zodResolver(createUserSchema) as any,
    defaultValues: {
      platformRole: "STANDARD",
      email: "",
      name: "",
      password: "",
    },
  });

  const handlePlatformRoleChange = (role: "STANDARD" | "SUPER_ADMIN") => {
    setPlatformRole(role);
    setValue("platformRole", role);
  };

  async function onSubmit(values: CreateUserInput) {
    setSubmitting(true);

    const payload = {
      ...values,
      platformRole,
      memberships: platformRole === "STANDARD" ? memberships : [],
    };

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Failed to create user");
      return;
    }

    toast.success("User account created successfully");
    reset();
    setMemberships([]);
    setPlatformRole("STANDARD");
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
      <DialogContent className="sm:max-w-3xl bg-slate-900 border-slate-800 text-slate-100 dark max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-100">
            <KeyIcon className="size-4 text-blue-400" /> Create Platform User
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Create a user account, set credentials, and configure granular tree permissions per company.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
          {/* User Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl border border-slate-800 bg-slate-950/50">
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
          </div>

          {/* Access Control Tree Component */}
          <AccessTree
            platformRole={platformRole}
            onPlatformRoleChange={handlePlatformRoleChange}
            companies={companies}
            memberships={memberships}
            onMembershipsChange={setMemberships}
          />

          <DialogFooter className="pt-2 border-t border-slate-800">
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
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-500 text-xs font-semibold px-5"
            >
              {submitting ? "Creating User..." : "Create User & Grant Access"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
