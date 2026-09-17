"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  updateUserSchema,
  type UpdateUserInput,
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
import { KeyRoundIcon, Edit3Icon } from "lucide-react";
import { AccessTree, type CompanyOption, type AccessTreeMembership } from "./access-tree";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  platformRole: string;
  memberships?: Array<{
    companyId: string;
    role: string;
    permissions?: string[] | null;
  }>;
}

export function EditUserDialog({
  user,
  companies = [],
}: {
  user: UserProfile;
  companies?: CompanyOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const initialPlatformRole = (user.platformRole as "STANDARD" | "SUPER_ADMIN") || "STANDARD";
  const initialMemberships: AccessTreeMembership[] = (user.memberships ?? []).map((m) => ({
    companyId: m.companyId,
    role: (m.role as any) || "HR_STAFF",
    permissions: Array.isArray(m.permissions) ? m.permissions : [],
  }));

  const [platformRole, setPlatformRole] = useState<"STANDARD" | "SUPER_ADMIN">(initialPlatformRole);
  const [memberships, setMemberships] = useState<AccessTreeMembership[]>(initialMemberships);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema) as any,
    defaultValues: {
      name: user.name ?? "",
      email: user.email,
      platformRole: initialPlatformRole,
      password: "",
    },
  });

  const handlePlatformRoleChange = (role: "STANDARD" | "SUPER_ADMIN") => {
    setPlatformRole(role);
    setValue("platformRole", role);
  };

  async function onSubmit(values: UpdateUserInput) {
    setSubmitting(true);

    const payload = {
      ...values,
      platformRole,
      memberships: platformRole === "STANDARD" ? memberships : [],
    };

    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Failed to update user account");
      return;
    }

    toast.success("User credentials and access tree updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="h-7 text-xs border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
            <Edit3Icon className="size-3 mr-1" /> Edit &amp; Permissions
          </Button>
        }
      />
      <DialogContent className="sm:max-w-3xl bg-slate-900 border-slate-800 text-slate-100 dark max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-100">
            <KeyRoundIcon className="size-4 text-blue-400" /> Edit Credentials &amp; Access — {user.name || user.email}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Modify credentials, platform role, or customize company &amp; feature access tree.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
          {/* User Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl border border-slate-800 bg-slate-950/50">
            <div className="space-y-1.5">
              <Label htmlFor={`name-${user.id}`} className="text-xs font-medium text-slate-300">
                Full Name
              </Label>
              <Input
                id={`name-${user.id}`}
                className="bg-slate-950 border-slate-800 text-xs h-9 text-slate-100"
                {...register("name")}
              />
              {errors.name && <p className="text-[11px] text-rose-400 font-medium">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`email-${user.id}`} className="text-xs font-medium text-slate-300">
                Email Address / Username
              </Label>
              <Input
                id={`email-${user.id}`}
                type="email"
                className="bg-slate-950 border-slate-800 text-xs h-9 text-slate-100"
                {...register("email")}
              />
              {errors.email && <p className="text-[11px] text-rose-400 font-medium">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`password-${user.id}`} className="text-xs font-medium text-slate-300">
                New Password (Optional)
              </Label>
              <Input
                id={`password-${user.id}`}
                type="password"
                placeholder="Leave blank to keep current"
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
              {submitting ? "Saving..." : "Save Credentials & Access Tree"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
