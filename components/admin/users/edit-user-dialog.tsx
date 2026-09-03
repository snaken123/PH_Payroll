"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateUserSchema, platformRoleValues, type UpdateUserInput } from "@/lib/validations/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { KeyRoundIcon, Edit3Icon } from "lucide-react";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  platformRole: string;
}

export function EditUserDialog({ user }: { user: UserProfile }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: user.name ?? "",
      email: user.email,
      platformRole: user.platformRole as "STANDARD" | "SUPER_ADMIN",
      password: "",
    },
  });

  async function onSubmit(values: UpdateUserInput) {
    setSubmitting(true);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Failed to update user account");
      return;
    }

    toast.success("User credentials and profile updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="h-7 text-xs border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
            <Edit3Icon className="size-3 mr-1" /> Edit Credentials
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100 dark">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-100">
            <KeyRoundIcon className="size-4 text-blue-400" /> Edit Credentials — {user.name || user.email}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Update user details, change email/username, or set a new password.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
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
              New Password (Leave blank to keep current)
            </Label>
            <Input
              id={`password-${user.id}`}
              type="password"
              placeholder="Enter new password to reset"
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

          <DialogFooter className="pt-2">
            <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-500 text-xs font-semibold">
              {submitting ? "Saving..." : "Save Credentials"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
