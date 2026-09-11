"use client";

import { useState, useEffect } from "react";
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
  rankValues,
  scheduleTypeValues,
  paymentMethodValues,
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

interface CompanyOption {
  id: string;
  legalName: string;
  tradeName?: string | null;
  companyCode: string;
}

const INITIAL_ALLOWANCES = ["Communication", "Inter-Company", "Transportation"];

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

  const [allowanceTypes, setAllowanceTypes] = useState<string[]>(INITIAL_ALLOWANCES);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [customLabels, setCustomLabels] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!open) return;

    fetch("/api/allowance-types")
      .then((res) => res.json())
      .then((data) => {
        if (data.allowanceTypes) {
          setAllowanceTypes(data.allowanceTypes);
        }
      })
      .catch(() => {});

    fetch("/api/companies/options")
      .then((res) => res.json())
      .then((data) => {
        if (data.companies) {
          setCompanies(data.companies);
        }
      })
      .catch(() => {});
  }, [open]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateEmployeeFormValues, unknown, CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
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
  const watchAllowances = watch("allowances") ?? [];

  async function onSubmit(values: CreateEmployeeInput) {
    setSubmitting(true);

    const resolvedAllowances = (values.allowances || []).map((a, idx) => {
      const customVal = customLabels[idx];
      const finalLabel = a.label === "OTHER" ? (customVal && customVal.trim() ? customVal.trim() : "Other") : a.label;
      return {
        ...a,
        label: finalLabel,
        payingCompanyId: a.payingCompanyId || null,
      };
    });

    const payload = {
      ...values,
      allowances: resolvedAllowances,
    };

    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error?.formErrors?.join?.(", ") ?? body?.error ?? "Failed to create employee");
      return;
    }

    toast.success("Employee added");
    reset();
    setCustomLabels({});
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
            <Label>Rank</Label>
            <Controller
              control={control}
              name="rank"
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger>
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
            <Label>Schedule Type</Label>
            <Controller
              control={control}
              name="scheduleType"
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger>
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
            <Label htmlFor="dateHired">Date hired</Label>
            <Input id="dateHired" type="date" {...register("dateHired")} />
            {errors.dateHired && <p className="text-sm text-destructive">{errors.dateHired.message}</p>}
          </div>

          <div className="space-y-4 sm:col-span-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Payroll Bank Account</Label>
              <p className="text-[11px] text-slate-500">Employee direct deposit bank account details for payroll disbursements.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="create_paymentMethod">Payment Method</Label>
                <Controller
                  control={control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <Select value={field.value ?? "BANK_TRANSFER"} onValueChange={field.onChange}>
                      <SelectTrigger id="create_paymentMethod">
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
                <Label htmlFor="create_bankName">Bank Name</Label>
                <Input id="create_bankName" placeholder="e.g. BDO Unibank, BPI, Metrobank" {...register("bankName")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="create_bankAccountNumber">Account Number</Label>
                <Input id="create_bankAccountNumber" placeholder="e.g. 1234-5678-9012" {...register("bankAccountNumber")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="create_bankBranch">Bank Branch</Label>
                <Input id="create_bankBranch" placeholder="e.g. Makati Avenue Branch" {...register("bankBranch")} />
              </div>
            </div>
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

          <div className="space-y-3 sm:col-span-2 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <Label className="font-bold">Allowances</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendAllowance({
                    label: allowanceTypes[0] || "Transportation",
                    amount: 0,
                    isTaxable: true,
                    payingCompanyId: "",
                  })
                }
              >
                <PlusIcon /> Add allowance
              </Button>
            </div>
            {allowanceFields.length === 0 && (
              <p className="text-xs text-muted-foreground">
                e.g. Transportation, Rice, Mobile Phone — optional, added to gross pay each cutoff.
              </p>
            )}
            {allowanceFields.map((field, index) => {
              const currentLabel = watchAllowances[index]?.label ?? field.label;
              const isCustom = currentLabel === "OTHER" || (!allowanceTypes.includes(currentLabel) && currentLabel !== "");

              return (
                <div
                  key={field.id}
                  className="p-3 rounded-md border border-slate-200/80 dark:border-slate-800 bg-background space-y-2.5 shadow-2xs"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor={`create_allowances.${index}.label`}>Label Choice</Label>
                      <Controller
                        control={control}
                        name={`allowances.${index}.label` as const}
                        render={({ field: labelField }) => {
                          const selectVal = isCustom ? "OTHER" : labelField.value;
                          return (
                            <Select
                              value={selectVal || "OTHER"}
                              onValueChange={(val) => {
                                if (val === "OTHER") {
                                  labelField.onChange("OTHER");
                                  if (!customLabels[index] && labelField.value !== "OTHER") {
                                    setCustomLabels((prev) => {
                                      const next = { ...prev };
                                      next[index] = labelField.value || "";
                                      return next;
                                    });
                                  }
                                } else {
                                  labelField.onChange(val);
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select allowance">
                                  {(value: string) => (value === "OTHER" ? "Other (Custom...)" : value)}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {allowanceTypes.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                                <SelectItem value="OTHER">Other (Type new allowance...)</SelectItem>
                              </SelectContent>
                            </Select>
                          );
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`create_allowances.${index}.payingCompanyId`}>Paying Company</Label>
                      <Controller
                        control={control}
                        name={`allowances.${index}.payingCompanyId` as const}
                        render={({ field: compField }) => (
                          <Select value={compField.value ?? ""} onValueChange={compField.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Current Company (Default)">
                                {(value: string) =>
                                  companies.find((c) => c.id === value)?.legalName ?? "Current Company (Default)"
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Current Company (Default)</SelectItem>
                              {companies.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.legalName} ({c.companyCode})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>

                  {isCustom && (
                    <div className="space-y-1">
                      <Label htmlFor={`create_allowances.${index}.customLabel`}>Custom Allowance Name</Label>
                      <Input
                        id={`create_allowances.${index}.customLabel`}
                        placeholder="e.g. Internet / Equipment Allowance"
                        value={customLabels[index] ?? (currentLabel === "OTHER" ? "" : currentLabel)}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomLabels((prev) => {
                            const next = { ...prev };
                            next[index] = val;
                            return next;
                          });
                          setValue(`allowances.${index}.label` as const, "OTHER");
                        }}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-1">
                    <div className="w-32 space-y-1">
                      <Label htmlFor={`create_allowances.${index}.amount`}>Amount (₱)</Label>
                      <Input
                        id={`create_allowances.${index}.amount`}
                        type="number"
                        step="0.01"
                        {...register(`allowances.${index}.amount` as const)}
                      />
                    </div>

                    <div className="flex items-center gap-1.5 pt-5">
                      <Controller
                        control={control}
                        name={`allowances.${index}.isTaxable` as const}
                        render={({ field: taxableField }) => (
                          <Switch
                            checked={taxableField.value}
                            onCheckedChange={taxableField.onChange}
                            id={`create_allowances.${index}.isTaxable`}
                          />
                        )}
                      />
                      <Label htmlFor={`create_allowances.${index}.isTaxable`} className="text-xs">
                        Taxable
                      </Label>
                    </div>

                    <div className="ml-auto pt-5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAllowance(index)}
                        aria-label="Remove allowance"
                      >
                        <XIcon className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
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
