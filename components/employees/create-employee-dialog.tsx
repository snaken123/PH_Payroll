"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, XIcon } from "lucide-react";
import {
  createEmployeeSchema,
  type CreateEmployeeFormValues,
  type CreateEmployeeInput,
  employeeTypeValues,
  sexValues,
  civilStatusValues,
  payBasisValues,
} from "@/lib/validations/employee";
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

const EMPLOYEE_TYPE_LABELS: Record<(typeof employeeTypeValues)[number], string> = {
  MONTHLY_RANK_AND_FILE: "Monthly rank-and-file",
  DAILY_HOURLY: "Daily / hourly",
  MANAGERIAL_SUPERVISORY: "Managerial / supervisory",
};

const PAY_BASIS_LABELS: Record<(typeof payBasisValues)[number], string> = {
  MONTHLY_RATE: "Monthly rate",
  DAILY_RATE: "Daily rate",
  HOURLY_RATE: "Hourly rate",
};

export function CreateEmployeeDialog({ branches }: { branches: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateEmployeeFormValues, unknown, CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    // Every Controller-bound Select must start with a defined value —
    // Base UI's Select decides controlled vs. uncontrolled on first render,
    // so leaving these `undefined` until the user picks something causes a
    // console warning and a stuck "value as label" display afterward.
    defaultValues: {
      isManagerialExempt: false,
      branchId: branches[0]?.id ?? "",
      sex: "" as CreateEmployeeFormValues["sex"],
      civilStatus: "" as CreateEmployeeFormValues["civilStatus"],
      employeeType: "" as CreateEmployeeFormValues["employeeType"],
      payBasis: "" as CreateEmployeeFormValues["payBasis"],
      allowances: [],
    },
  });

  const { fields: allowanceFields, append: appendAllowance, remove: removeAllowance } = useFieldArray({
    control,
    name: "allowances",
  });

  const employeeType = watch("employeeType");

  async function onSubmit(values: CreateEmployeeInput) {
    setSubmitting(true);
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error?.formErrors?.join?.(", ") ?? body?.error ?? "Failed to create employee");
      return;
    }

    toast.success("Employee added");
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>New employee</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add employee</DialogTitle>
          <DialogDescription>
            Creates the employee record and their initial compensation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Branch</Label>
            <Controller
              control={control}
              name="branchId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch">
                      {(value: string) => branches.find((b) => b.id === value)?.name ?? "Select branch"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.branchId && <p className="text-sm text-destructive">{errors.branchId.message}</p>}
          </div>

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
            <Label>Sex</Label>
            <Controller
              control={control}
              name="sex"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select">{(value: string) => value || "Select"}</SelectValue>
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
            <Label>Civil status</Label>
            <Controller
              control={control}
              name="civilStatus"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select">{(value: string) => value || "Select"}</SelectValue>
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
            <Label htmlFor="dateHired">Date hired</Label>
            <Input id="dateHired" type="date" {...register("dateHired")} />
            {errors.dateHired && <p className="text-sm text-destructive">{errors.dateHired.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Employee type</Label>
            <Controller
              control={control}
              name="employeeType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select">
                      {(value: keyof typeof EMPLOYEE_TYPE_LABELS) => EMPLOYEE_TYPE_LABELS[value] ?? "Select"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {employeeTypeValues.map((v) => (
                      <SelectItem key={v} value={v}>
                        {EMPLOYEE_TYPE_LABELS[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.employeeType && (
              <p className="text-sm text-destructive">{errors.employeeType.message}</p>
            )}
          </div>

          {employeeType === "MANAGERIAL_SUPERVISORY" && (
            <div className="flex items-center gap-2 self-end pb-2">
              <Controller
                control={control}
                name="isManagerialExempt"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} id="isManagerialExempt" />
                )}
              />
              <Label htmlFor="isManagerialExempt">Exempt from OT/holiday-premium rules</Label>
            </div>
          )}

          <div className="space-y-1">
            <Label>Pay basis</Label>
            <Controller
              control={control}
              name="payBasis"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select">
                      {(value: keyof typeof PAY_BASIS_LABELS) => PAY_BASIS_LABELS[value] ?? "Select"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {payBasisValues.map((v) => (
                      <SelectItem key={v} value={v}>
                        {PAY_BASIS_LABELS[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.payBasis && <p className="text-sm text-destructive">{errors.payBasis.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="basicRate">Basic rate (₱)</Label>
            <Input id="basicRate" type="number" step="0.01" {...register("basicRate")} />
            {errors.basicRate && <p className="text-sm text-destructive">{errors.basicRate.message}</p>}
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="standardWorkDaysPerMonth">
              Standard work days/month divisor <span className="text-muted-foreground">(optional, e.g. 261 ÷ 12)</span>
            </Label>
            <Input
              id="standardWorkDaysPerMonth"
              type="number"
              step="0.01"
              {...register("standardWorkDaysPerMonth")}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <div className="flex items-center justify-between">
              <Label>Allowances</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendAllowance({ label: "", amount: 0, isTaxable: true })}
              >
                <PlusIcon /> Add allowance
              </Button>
            </div>
            {allowanceFields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                e.g. Transportation, Rice, Mobile Phone — optional, added to gross pay each cutoff.
              </p>
            )}
            {allowanceFields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor={`allowances.${index}.label`}>Label</Label>
                  <Input
                    id={`allowances.${index}.label`}
                    placeholder="e.g. Transportation Allowance"
                    {...register(`allowances.${index}.label` as const)}
                  />
                  {errors.allowances?.[index]?.label && (
                    <p className="text-sm text-destructive">{errors.allowances[index]?.label?.message}</p>
                  )}
                </div>
                <div className="w-28 space-y-1">
                  <Label htmlFor={`allowances.${index}.amount`}>Amount (₱)</Label>
                  <Input
                    id={`allowances.${index}.amount`}
                    type="number"
                    step="0.01"
                    {...register(`allowances.${index}.amount` as const)}
                  />
                </div>
                <div className="flex items-center gap-1.5 pb-2">
                  <Controller
                    control={control}
                    name={`allowances.${index}.isTaxable` as const}
                    render={({ field: taxableField }) => (
                      <Switch
                        checked={taxableField.value}
                        onCheckedChange={taxableField.onChange}
                        id={`allowances.${index}.isTaxable`}
                      />
                    )}
                  />
                  <Label htmlFor={`allowances.${index}.isTaxable`} className="text-xs">
                    Taxable
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAllowance(index)}
                  aria-label="Remove allowance"
                >
                  <XIcon />
                </Button>
              </div>
            ))}
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
              {submitting ? "Adding..." : "Add employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
