"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  editEmployeeProfileSchema,
  sexValues,
  civilStatusValues,
  type EditEmployeeProfileFormValues,
  type EditEmployeeProfileInput,
} from "@/lib/validations/employee";
import { toast } from "sonner";

export function EditEmployeeProfileDialog({
  employeeId,
  defaultValues,
}: {
  employeeId: string;
  defaultValues: EditEmployeeProfileFormValues;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EditEmployeeProfileFormValues, unknown, EditEmployeeProfileInput>({
    resolver: zodResolver(editEmployeeProfileSchema),
    values: defaultValues,
  });

  async function onSubmit(values: EditEmployeeProfileInput) {
    setSubmitting(true);
    const res = await fetch(`/api/employees/${employeeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error?.formErrors?.join?.(", ") ?? body?.error ?? "Failed to update employee");
      return;
    }

    toast.success("Employee profile updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Edit profile</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit employee profile</DialogTitle>
          <DialogDescription>Update personal details and government ID numbers.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="employeeNumber">Employee number</Label>
            <Input id="employeeNumber" {...register("employeeNumber")} />
            {errors.employeeNumber && (
              <p className="text-sm text-destructive">{errors.employeeNumber.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" {...register("firstName")} />
            {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" {...register("lastName")} />
            {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="middleName">Middle name</Label>
            <Input id="middleName" {...register("middleName")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="birthDate">Birth date</Label>
            <Input id="birthDate" type="date" {...register("birthDate")} />
            {errors.birthDate && <p className="text-sm text-destructive">{errors.birthDate.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="sex">Sex</Label>
            <Controller
              control={control}
              name="sex"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="sex">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {sexValues.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="civilStatus">Civil status</Label>
            <Controller
              control={control}
              name="civilStatus"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="civilStatus">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {civilStatusValues.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="positionTitle">Position title</Label>
            <Input id="positionTitle" {...register("positionTitle")} />
            {errors.positionTitle && (
              <p className="text-sm text-destructive">{errors.positionTitle.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="departmentName">Department</Label>
            <Input id="departmentName" {...register("departmentName")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tin">TIN</Label>
            <Input id="tin" {...register("tin")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sssNumber">SSS number</Label>
            <Input id="sssNumber" {...register("sssNumber")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="philhealthNumber">PhilHealth number</Label>
            <Input id="philhealthNumber" {...register("philhealthNumber")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pagibigNumber">Pag-IBIG number</Label>
            <Input id="pagibigNumber" {...register("pagibigNumber")} />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
