"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, XIcon } from "lucide-react";
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
import {
  compensationRecordSchema,
  payBasisValues,
  updateTypeValues,
  type CompensationRecordFormValues,
  type CompensationRecordInput,
} from "@/lib/validations/employee";
import { toast } from "sonner";

interface CompanyOption {
  id: string;
  legalName: string;
  tradeName?: string | null;
  companyCode: string;
}

const UPDATE_TYPE_LABELS: Record<(typeof updateTypeValues)[number], string> = {
  BOTH: "Both Basic Rate & Allowances",
  BASIC: "Change Basic Pay Rate Only",
  ALLOWANCE: "Change / Add Allowances Only",
};

const INITIAL_ALLOWANCES = ["Communication", "Inter-Company", "Transportation"];

interface CurrentCompProp {
  payBasis: string;
  basicRate: number | string;
  standardWorkDaysPerMonth?: number | string | null;
  allowances?: Array<{
    label: string;
    amount: number | string;
    isTaxable: boolean;
    payingCompanyId?: string | null;
  }>;
}

export function AddCompensationDialog({
  employeeId,
  currentCompensation,
}: {
  employeeId: string;
  currentCompensation?: CurrentCompProp;
}) {
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
  } = useForm<CompensationRecordFormValues, unknown, CompensationRecordInput>({
    resolver: zodResolver(compensationRecordSchema),
    defaultValues: {
      updateType: "BOTH",
      effectiveFrom: new Date().toISOString().slice(0, 10),
      payBasis: (currentCompensation?.payBasis as (typeof payBasisValues)[number]) ?? "MONTHLY_RATE",
      basicRate: currentCompensation ? Number(currentCompensation.basicRate) : undefined,
      standardWorkDaysPerMonth: currentCompensation?.standardWorkDaysPerMonth
        ? Number(currentCompensation.standardWorkDaysPerMonth)
        : undefined,
      allowances: currentCompensation?.allowances
        ? currentCompensation.allowances.map((a) => ({
            label: a.label,
            amount: Number(a.amount),
            isTaxable: a.isTaxable,
            payingCompanyId: a.payingCompanyId ?? "",
          }))
        : [],
    },
  });

  const updateType = watch("updateType") ?? "BOTH";
  const watchAllowances = watch("allowances") ?? [];

  const {
    fields: allowanceFields,
    append: appendAllowance,
    remove: removeAllowance,
  } = useFieldArray({
    control,
    name: "allowances",
  });

  async function onSubmit(values: CompensationRecordInput) {
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

    const res = await fetch(`/api/employees/${employeeId}/compensation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error?.formErrors?.join?.(", ") ?? body?.error ?? "Failed to update compensation");
      return;
    }

    toast.success("Compensation updated");
    reset();
    setCustomLabels({});
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>New rate</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Update compensation</DialogTitle>
          <DialogDescription>
            Closes the current rate and starts a new one — past payroll history is unaffected.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="updateType">What would you like to update?</Label>
              <Controller
                control={control}
                name="updateType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="updateType">
                      <SelectValue placeholder="Select update type">
                        {(value: keyof typeof UPDATE_TYPE_LABELS) => UPDATE_TYPE_LABELS[value] ?? "Select"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {updateTypeValues.map((v) => (
                        <SelectItem key={v} value={v}>
                          {UPDATE_TYPE_LABELS[v]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="effectiveFrom">Effective from</Label>
              <Input id="effectiveFrom" type="date" required {...register("effectiveFrom")} />
              {errors.effectiveFrom && <p className="text-sm text-destructive">{errors.effectiveFrom.message}</p>}
            </div>
          </div>

          {(updateType === "BASIC" || updateType === "BOTH") && (
            <div className="space-y-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Basic Pay Rate Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="payBasis">Pay basis</Label>
                  <Controller
                    control={control}
                    name="payBasis"
                    render={({ field }) => (
                      <Select value={field.value ?? "MONTHLY_RATE"} onValueChange={field.onChange}>
                        <SelectTrigger id="payBasis">
                          <SelectValue>{(value: string) => (value ? value.replaceAll("_", " ") : "Select")}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {payBasisValues.map((v) => (
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
                  <Label htmlFor="basicRate">Basic rate (₱)</Label>
                  <Input
                    id="basicRate"
                    type="number"
                    step="0.01"
                    required={updateType === "BASIC" || updateType === "BOTH"}
                    {...register("basicRate")}
                  />
                  {errors.basicRate && <p className="text-sm text-destructive">{errors.basicRate.message}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="standardWorkDaysPerMonth">Standard work days/month divisor (optional)</Label>
                <Input
                  id="standardWorkDaysPerMonth"
                  type="number"
                  step="0.01"
                  {...register("standardWorkDaysPerMonth")}
                />
                {errors.standardWorkDaysPerMonth && (
                  <p className="text-sm text-destructive">{errors.standardWorkDaysPerMonth.message}</p>
                )}
              </div>
            </div>
          )}

          {(updateType === "ALLOWANCE" || updateType === "BOTH") && (
            <div className="space-y-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Allowances
                </h4>
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
                  No allowances added yet. Click &quot;Add allowance&quot; to define an allowance line.
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
                        <Label htmlFor={`allowances.${index}.label`}>Label Choice</Label>
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
                        <Label htmlFor={`allowances.${index}.payingCompanyId`}>Paying Company</Label>
                        <Controller
                          control={control}
                          name={`allowances.${index}.payingCompanyId` as const}
                          render={({ field: compField }) => (
                            <Select value={compField.value ?? ""} onValueChange={compField.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Current Employee Company (Default)">
                                  {(value: string) =>
                                    companies.find((c) => c.id === value)?.legalName ??
                                    "Current Employee Company (Default)"
                                  }
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Current Employee Company (Default)</SelectItem>
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
                        <Label htmlFor={`allowances.${index}.customLabel`}>Custom Allowance Name</Label>
                        <Input
                          id={`allowances.${index}.customLabel`}
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
                        <Label htmlFor={`allowances.${index}.amount`}>Amount (₱)</Label>
                        <Input
                          id={`allowances.${index}.amount`}
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
                              id={`allowances.${index}.isTaxable`}
                            />
                          )}
                        />
                        <Label htmlFor={`allowances.${index}.isTaxable`} className="text-xs">
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
          )}

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
