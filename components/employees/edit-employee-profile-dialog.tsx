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
  rankValues,
  scheduleTypeValues,
  paymentMethodValues,
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
            <Label htmlFor="rank">Rank</Label>
            <Controller
              control={control}
              name="rank"
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger id="rank">
                    <SelectValue placeholder="Select rank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None / Unspecified</SelectItem>
                    {rankValues.map((v) => (
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
            <Label htmlFor="scheduleType">Schedule Type</Label>
            <Controller
              control={control}
              name="scheduleType"
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger id="scheduleType">
                    <SelectValue placeholder="Select schedule type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None / Unspecified</SelectItem>
                    {scheduleTypeValues.map((v) => (
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

          <div className="space-y-4 sm:col-span-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Payroll Bank Account</Label>
              <p className="text-[11px] text-slate-500">Employee direct deposit bank account details for payroll disbursements.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Controller
                  control={control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <Select value={field.value ?? "BANK_TRANSFER"} onValueChange={field.onChange}>
                      <SelectTrigger id="paymentMethod">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethodValues.map((v) => (
                          <SelectItem key={v} value={v}>
                            {v.replaceAll("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input id="bankName" placeholder="e.g. BDO Unibank, BPI, Metrobank" {...register("bankName")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bankAccountNumber">Account Number</Label>
                <Input id="bankAccountNumber" placeholder="e.g. 1234-5678-9012" {...register("bankAccountNumber")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bankBranch">Bank Branch</Label>
                <Input id="bankBranch" placeholder="e.g. Makati Avenue Branch" {...register("bankBranch")} />
              </div>
            </div>
          </div>

          <div className="space-y-4 sm:col-span-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Statutory Deductions &amp; Contribution Override</Label>
              <p className="text-[11px] text-slate-500">Choose between standard statutory rate table calculation or nominated manual contribution overrides.</p>
            </div>

            {/* SSS Contribution Group */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                  <input type="checkbox" className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" {...register("isDeductSss")} />
                  <span>SSS Contribution</span>
                </label>
                <Controller
                  control={control}
                  name="sssDeductionMode"
                  render={({ field }) => (
                    <Select value={field.value ?? "TABLE"} onValueChange={field.onChange}>
                      <SelectTrigger className="h-7 text-xs w-44">
                        <SelectValue placeholder="Calculation mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TABLE" className="text-xs">Standard Table Rate</SelectItem>
                        <SelectItem value="MANUAL" className="text-xs">Manual Entry (Nominated)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <Controller
                control={control}
                name="sssDeductionMode"
                render={({ field }) => field.value === "MANUAL" ? (
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                    <div className="space-y-1">
                      <Label htmlFor="sssCustomAmountEe" className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Nominated EE Share (₱)</Label>
                      <Input id="sssCustomAmountEe" type="number" step="0.01" placeholder="e.g. 500.00" {...register("sssCustomAmountEe")} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="sssCustomAmountEr" className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Nominated ER Share (₱)</Label>
                      <Input id="sssCustomAmountEr" type="number" step="0.01" placeholder="e.g. 1000.00" {...register("sssCustomAmountEr")} className="h-8 text-xs" />
                    </div>
                  </div>
                ) : <></>}
              />
            </div>

            {/* PhilHealth Contribution Group */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                  <input type="checkbox" className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" {...register("isDeductPhilhealth")} />
                  <span>PhilHealth Contribution</span>
                </label>
                <Controller
                  control={control}
                  name="philhealthDeductionMode"
                  render={({ field }) => (
                    <Select value={field.value ?? "TABLE"} onValueChange={field.onChange}>
                      <SelectTrigger className="h-7 text-xs w-44">
                        <SelectValue placeholder="Calculation mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TABLE" className="text-xs">Standard Table Rate</SelectItem>
                        <SelectItem value="MANUAL" className="text-xs">Manual Entry (Nominated)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <Controller
                control={control}
                name="philhealthDeductionMode"
                render={({ field }) => field.value === "MANUAL" ? (
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                    <div className="space-y-1">
                      <Label htmlFor="philhealthCustomAmountEe" className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Nominated EE Share (₱)</Label>
                      <Input id="philhealthCustomAmountEe" type="number" step="0.01" placeholder="e.g. 400.00" {...register("philhealthCustomAmountEe")} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="philhealthCustomAmountEr" className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Nominated ER Share (₱)</Label>
                      <Input id="philhealthCustomAmountEr" type="number" step="0.01" placeholder="e.g. 400.00" {...register("philhealthCustomAmountEr")} className="h-8 text-xs" />
                    </div>
                  </div>
                ) : <></>}
              />
            </div>

            {/* Pag-IBIG Contribution Group */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                  <input type="checkbox" className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" {...register("isDeductPagibig")} />
                  <span>Pag-IBIG (HDMF) Contribution</span>
                </label>
                <Controller
                  control={control}
                  name="pagibigDeductionMode"
                  render={({ field }) => (
                    <Select value={field.value ?? "TABLE"} onValueChange={field.onChange}>
                      <SelectTrigger className="h-7 text-xs w-44">
                        <SelectValue placeholder="Calculation mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TABLE" className="text-xs">Standard Table Rate</SelectItem>
                        <SelectItem value="MANUAL" className="text-xs">Manual Entry (Nominated)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <Controller
                control={control}
                name="pagibigDeductionMode"
                render={({ field }) => field.value === "MANUAL" ? (
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                    <div className="space-y-1">
                      <Label htmlFor="pagibigCustomAmountEe" className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Nominated EE Share (₱)</Label>
                      <Input id="pagibigCustomAmountEe" type="number" step="0.01" placeholder="e.g. 200.00" {...register("pagibigCustomAmountEe")} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="pagibigCustomAmountEr" className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Nominated ER Share (₱)</Label>
                      <Input id="pagibigCustomAmountEr" type="number" step="0.01" placeholder="e.g. 200.00" {...register("pagibigCustomAmountEr")} className="h-8 text-xs" />
                    </div>
                  </div>
                ) : <></>}
              />
            </div>
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
