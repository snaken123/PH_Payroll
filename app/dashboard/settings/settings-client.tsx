"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
  CalendarDaysIcon,
  Building2Icon,
  PaletteIcon,
  UsersIcon,
  PlusCircleIcon,
  LandmarkIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
  Trash2Icon,
  StarIcon,
  ClockIcon,
} from "lucide-react";

interface CompanyData {
  id: string;
  companyCode: string;
  legalName: string;
  tradeName: string | null;
  tin: string;
  rdoCode: string;
  sssEmployerNumber: string | null;
  philhealthEmployerNumber: string | null;
  pagibigEmployerId: string | null;
  registeredAddress: string;
  region: string;
  payScheduleStyle: string;
  cutoff1StartDay: number;
  cutoff1EndDay: number;
  cutoff2StartDay: number;
  cutoff2EndDay: number;
  payDateOffsetDays: number;
  standardWorkDaysPerMonth: number;
  statutoryDeductionTiming?: "FIRST_HALF" | "SECOND_HALF" | "SPLIT";
  basicPayFrequency?: "TWICE_A_MONTH" | "ONCE_A_MONTH_SECOND_HALF" | "ONCE_A_MONTH_FIRST_HALF";
  allowancePayFrequency?: "TWICE_A_MONTH" | "ONCE_A_MONTH_SECOND_HALF" | "ONCE_A_MONTH_FIRST_HALF";
  includeOtherCompanyAllowancesInContributions?: boolean;
  waiveMandatoryMpfWisp?: boolean;
  bossKeyIncludeOtherCompanyAllowances?: boolean;
  bossKeyWaiveMandatoryMpfWisp?: boolean;
  attendanceStandardTimeIn?: string;
  attendanceStandardTimeOut?: string;
  attendanceLunchBreakMinutes?: number;
  attendanceLateGracePeriodMinutes?: number;
  attendanceOtGracePeriodMinutes?: number;
  attendanceFlexi1WindowStart?: string;
  attendanceFlexi1WindowEnd?: string;
  attendanceFlexi1LateGracePeriodMinutes?: number;
  attendanceSaturdayRuleEnabled?: boolean;
  attendanceSaturdayWindowStart?: string;
  attendanceSaturdayWindowEnd?: string;
  attendanceSaturdayGracePeriodMinutes?: number;
  attendanceSaturdayShiftHours?: number;
  attendanceSaturdayBreakMinutes?: number;
  attendanceSaturdayEmployeeIds?: any;
}

interface BankAccountData {
  id: string;
  bankName: string;
  nickname: string | null;
  accountNumber: string;
  accountName: string;
  branchName: string | null;
  swiftCode: string | null;
  isDefault: boolean;
}

interface EmployeeData {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  tin: string | null;
  employmentStatus: string;
  isIncludedInAlphalist: boolean;
}

import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

export function SettingsClient({
  company,
  bankAccounts: initialBankAccounts,
  employees: initialEmployees,
  isSuperAdmin = false,
}: {
  company: CompanyData;
  bankAccounts: BankAccountData[];
  employees: EmployeeData[];
  isSuperAdmin?: boolean;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState(initialEmployees);
  const [bankAccounts, setBankAccounts] = useState(initialBankAccounts);

  // Bank Add Dialog State
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [newBank, setNewBank] = useState({
    bankName: "",
    nickname: "",
    accountNumber: "",
    accountName: company.legalName,
    branchName: "",
    swiftCode: "",
    isDefault: false,
  });

  const [confirmWorkDaysDialogOpen, setConfirmWorkDaysDialogOpen] = useState(false);

  // Company Pay Period & Details Form State
  const initialFormDataState = {
    legalName: company.legalName,
    tradeName: company.tradeName ?? "",
    tin: company.tin,
    rdoCode: company.rdoCode,
    sssEmployerNumber: company.sssEmployerNumber ?? "",
    philhealthEmployerNumber: company.philhealthEmployerNumber ?? "",
    pagibigEmployerId: company.pagibigEmployerId ?? "",
    registeredAddress: company.registeredAddress,
    region: company.region,
    payScheduleStyle: company.payScheduleStyle,
    cutoff1StartDay: company.cutoff1StartDay,
    cutoff1EndDay: company.cutoff1EndDay,
    cutoff2StartDay: company.cutoff2StartDay,
    cutoff2EndDay: company.cutoff2EndDay,
    payDateOffsetDays: company.payDateOffsetDays,
    standardWorkDaysPerMonth: company.standardWorkDaysPerMonth ?? 26,
    statutoryDeductionTiming: company.statutoryDeductionTiming ?? "SECOND_HALF",
    basicPayFrequency: company.basicPayFrequency ?? "TWICE_A_MONTH",
    allowancePayFrequency: company.allowancePayFrequency ?? "TWICE_A_MONTH",
    includeOtherCompanyAllowancesInContributions: company.includeOtherCompanyAllowancesInContributions ?? false,
    waiveMandatoryMpfWisp: company.waiveMandatoryMpfWisp ?? false,
    attendanceStandardTimeIn: company.attendanceStandardTimeIn ?? "09:30",
    attendanceStandardTimeOut: company.attendanceStandardTimeOut ?? "18:30",
    attendanceLunchBreakMinutes: company.attendanceLunchBreakMinutes ?? 60,
    attendanceLateGracePeriodMinutes: company.attendanceLateGracePeriodMinutes ?? 15,
    attendanceOtGracePeriodMinutes: company.attendanceOtGracePeriodMinutes ?? 15,
    attendanceFlexi1WindowStart: company.attendanceFlexi1WindowStart ?? "07:00",
    attendanceFlexi1WindowEnd: company.attendanceFlexi1WindowEnd ?? "10:00",
    attendanceFlexi1LateGracePeriodMinutes: company.attendanceFlexi1LateGracePeriodMinutes ?? 15,
    attendanceSaturdayRuleEnabled: company.attendanceSaturdayRuleEnabled ?? true,
    attendanceSaturdayWindowStart: company.attendanceSaturdayWindowStart ?? "07:30",
    attendanceSaturdayWindowEnd: company.attendanceSaturdayWindowEnd ?? "10:30",
    attendanceSaturdayGracePeriodMinutes: company.attendanceSaturdayGracePeriodMinutes ?? 10,
    attendanceSaturdayShiftHours: company.attendanceSaturdayShiftHours ?? 5.0,
    attendanceSaturdayBreakMinutes: company.attendanceSaturdayBreakMinutes ?? 0,
    attendanceSaturdayEmployeeIds: Array.isArray(company.attendanceSaturdayEmployeeIds) ? company.attendanceSaturdayEmployeeIds : [],
  };

  const [formData, setFormData] = useState(initialFormDataState);
  const [initialFormData, setInitialFormData] = useState(initialFormDataState);

  // Special Day Schedules State
  const [specialSchedules, setSpecialSchedules] = useState<any[]>([]);
  const [specialScheduleDialogOpen, setSpecialScheduleDialogOpen] = useState(false);
  const [specialDate, setSpecialDate] = useState("");
  const [specialTitle, setSpecialTitle] = useState("");
  const [specialTimeIn, setSpecialTimeIn] = useState("08:00");
  const [specialTimeOut, setSpecialTimeOut] = useState("17:00");
  const [specialGrace, setSpecialGrace] = useState(15);
  const [specialBreak, setSpecialBreak] = useState(60);
  const [loadingSpecial, setLoadingSpecial] = useState(false);
  const [savingSpecial, setSavingSpecial] = useState(false);

  useEffect(() => {
    fetchSpecialSchedules();
  }, []);

  async function fetchSpecialSchedules() {
    setLoadingSpecial(true);
    try {
      const res = await fetch("/api/attendance/special-schedules");
      if (res.ok) {
        const data = await res.json();
        setSpecialSchedules(data.schedules || []);
      }
    } catch (e) {
      console.error("Error fetching special schedules", e);
    } finally {
      setLoadingSpecial(false);
    }
  }

  async function handleCreateSpecialSchedule() {
    if (!specialDate || !specialTitle || !specialTimeIn) {
      toast.error("Please fill in Date, Title, and Time-In");
      return;
    }
    setSavingSpecial(true);
    try {
      const res = await fetch("/api/attendance/special-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workDate: specialDate,
          title: specialTitle,
          standardTimeIn: specialTimeIn,
          standardTimeOut: specialTimeOut || null,
          lunchBreakMinutes: Number(specialBreak),
          lateGracePeriodMinutes: Number(specialGrace),
          appliesToAllEmployees: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create special schedule");
      }
      toast.success("Special day schedule saved");
      setSpecialScheduleDialogOpen(false);
      setSpecialDate("");
      setSpecialTitle("");
      fetchSpecialSchedules();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSavingSpecial(false);
    }
  }

  async function handleDeleteSpecialSchedule(id: string) {
    if (!confirm("Are you sure you want to remove this special day schedule?")) return;
    try {
      const res = await fetch(`/api/attendance/special-schedules/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Special schedule removed");
        fetchSpecialSchedules();
      } else {
        toast.error("Failed to delete special schedule");
      }
    } catch {
      toast.error("Error deleting schedule");
    }
  }

  async function handleSaveSettings(applyToEmployeesOverride?: boolean | React.MouseEvent): Promise<boolean> {
    const override = typeof applyToEmployeesOverride === "boolean" ? applyToEmployeesOverride : undefined;
    const hasWorkDaysChanged = formData.standardWorkDaysPerMonth !== company.standardWorkDaysPerMonth;

    if (hasWorkDaysChanged && override === undefined) {
      setConfirmWorkDaysDialogOpen(true);
      return false;
    }

    const applyToEmployees = override ?? false;
    setSubmitting(true);
    setConfirmWorkDaysDialogOpen(false);
    try {
      const res = await fetch("/api/companies/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          applyWorkDaysToEmployees: applyToEmployees,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.formErrors?.join(", ") ?? body.error ?? "Failed to update settings");
      }

      const body = await res.json();
      if (applyToEmployees && body.updatedEmployeeCount) {
        toast.success(`Company settings updated and applied to ${body.updatedEmployeeCount} employee compensation records`);
      } else {
        toast.success("Company settings updated successfully");
      }
      setInitialFormData(formData);
      router.refresh();
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  const isSettingsDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData);

  const { UnsavedChangesDialog } = useUnsavedChanges({
    isDirty: isSettingsDirty,
    onSave: async () => {
      return await handleSaveSettings();
    },
  });

  async function handleAddBankAccount(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/companies/banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBank),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to add bank account");
      }

      const body = await res.json();
      setBankAccounts((prev) => [
        ...(newBank.isDefault ? prev.map((b) => ({ ...b, isDefault: false })) : prev),
        body.bankAccount,
      ]);
      toast.success("Payroll bank account added");
      setBankDialogOpen(false);
      setNewBank({
        bankName: "",
        nickname: "",
        accountNumber: "",
        accountName: company.legalName,
        branchName: "",
        swiftCode: "",
        isDefault: false,
      });
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetDefaultBank(id: string) {
    try {
      const res = await fetch(`/api/companies/banks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });

      if (!res.ok) throw new Error("Failed to set default bank");

      setBankAccounts((prev) =>
        prev.map((b) => ({ ...b, isDefault: b.id === id }))
      );
      toast.success("Default payroll bank account updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    }
  }

  async function handleDeleteBank(id: string) {
    try {
      const res = await fetch(`/api/companies/banks/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete bank account");

      setBankAccounts((prev) => prev.filter((b) => b.id !== id));
      toast.success("Bank account removed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    }
  }

  async function handleToggleAlphalist(employeeId: string, currentVal: boolean) {
    const newVal = !currentVal;
    setEmployees((prev) =>
      prev.map((e) => (e.id === employeeId ? { ...e, isIncludedInAlphalist: newVal } : e))
    );

    try {
      const res = await fetch("/api/employees/alphalist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, isIncludedInAlphalist: newVal }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      toast.success("Updated BIR Alphalist status");
    } catch {
      setEmployees((prev) =>
        prev.map((e) => (e.id === employeeId ? { ...e, isIncludedInAlphalist: currentVal } : e))
      );
      toast.error("Failed to update Alphalist inclusion");
    }
  }

  return (
    <>
      {UnsavedChangesDialog}
      <Tabs defaultValue="pay-period" className="space-y-6">
      <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-slate-100/90 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl">
        <TabsTrigger value="pay-period" className="flex items-center gap-1.5 text-xs py-2 px-3">
          <CalendarDaysIcon className="size-3.5" /> Pay Period Rules
        </TabsTrigger>
        <TabsTrigger value="attendance" className="flex items-center gap-1.5 text-xs py-2 px-3">
          <ClockIcon className="size-3.5" /> Attendance Shift Rules
        </TabsTrigger>
        {isSuperAdmin && (
          <TabsTrigger value="banks" className="flex items-center gap-1.5 text-xs py-2 px-3">
            <LandmarkIcon className="size-3.5" /> Payroll Banks
          </TabsTrigger>
        )}
        {isSuperAdmin && (
          <TabsTrigger value="company-details" className="flex items-center gap-1.5 text-xs py-2 px-3">
            <Building2Icon className="size-3.5" /> Company Details
          </TabsTrigger>
        )}
        {isSuperAdmin && (
          <TabsTrigger value="alphalist" className="flex items-center gap-1.5 text-xs py-2 px-3">
            <UsersIcon className="size-3.5" /> BIR Alphalist
          </TabsTrigger>
        )}
        <TabsTrigger value="theme" className="flex items-center gap-1.5 text-xs py-2 px-3">
          <PaletteIcon className="size-3.5" /> Appearance
        </TabsTrigger>
      </TabsList>

      {/* 1. Pay Period Rules Tab */}
      <TabsContent value="pay-period" className="space-y-6">
        <Card className="border-slate-200/90 shadow-xs dark:border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CalendarDaysIcon className="size-4 text-blue-600" /> Company Pay Period Rules
            </CardTitle>
            <CardDescription className="text-xs">
              Configure default semi-monthly cutoff days and pay dates for {company.legalName}. When computing payroll, the run dialog will automatically apply these defaults.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="payScheduleStyle">Pay Schedule Style</Label>
              <Select
                value={formData.payScheduleStyle}
                onValueChange={(val) => {
                  if (val === "STANDARD_1_15") {
                    setFormData((prev) => ({
                      ...prev,
                      payScheduleStyle: val,
                      cutoff1StartDay: 1,
                      cutoff1EndDay: 15,
                      cutoff2StartDay: 16,
                      cutoff2EndDay: 0,
                    }));
                  } else if (val === "MIDMONTH_10_25") {
                    setFormData((prev) => ({
                      ...prev,
                      payScheduleStyle: val,
                      cutoff1StartDay: 26,
                      cutoff1EndDay: 10,
                      cutoff2StartDay: 11,
                      cutoff2EndDay: 25,
                    }));
                  } else {
                    setFormData((prev) => ({ ...prev, payScheduleStyle: val ?? "CUSTOM" }));
                  }
                }}
              >
                <SelectTrigger id="payScheduleStyle" className="max-w-md">
                  <SelectValue placeholder="Select pay schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDARD_1_15">
                    Standard Semi-Monthly (1st–15th &amp; 16th–End)
                  </SelectItem>
                  <SelectItem value="MIDMONTH_10_25">
                    Mid-Month Cycle (11th–25th &amp; 26th–10th)
                  </SelectItem>
                  <SelectItem value="CUSTOM">Custom Day Ranges</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 max-w-2xl pt-2">
              <div className="space-y-3 rounded-lg border p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  1st Cutoff (Withholding Tax Only)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Start Day</Label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={formData.cutoff1StartDay}
                      onChange={(e) => setFormData({ ...formData, cutoff1StartDay: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">End Day</Label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={formData.cutoff1EndDay}
                      onChange={(e) => setFormData({ ...formData, cutoff1EndDay: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  2nd Cutoff (SSS / PhilHealth / Pag-IBIG)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Start Day</Label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={formData.cutoff2StartDay}
                      onChange={(e) => setFormData({ ...formData, cutoff2StartDay: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">End Day (0 = End of Month)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={31}
                      value={formData.cutoff2EndDay}
                      onChange={(e) => setFormData({ ...formData, cutoff2EndDay: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-lg">
              <div className="space-y-2">
                <Label htmlFor="payDateOffsetDays">Default Pay Date Offset (Days)</Label>
                <Input
                  id="payDateOffsetDays"
                  type="number"
                  min={0}
                  max={30}
                  value={formData.payDateOffsetDays}
                  onChange={(e) => setFormData({ ...formData, payDateOffsetDays: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="standardWorkDaysPerMonth">Standard Work Days / Month</Label>
                <Input
                  id="standardWorkDaysPerMonth"
                  type="number"
                  step="0.1"
                  min={1}
                  max={31}
                  value={formData.standardWorkDaysPerMonth}
                  onChange={(e) => setFormData({ ...formData, standardWorkDaysPerMonth: Number(e.target.value) })}
                />
                <p className="text-[11px] text-muted-foreground">Default monthly rate divisor (e.g., 22, 21.75, 26)</p>
              </div>
            </div>

            <div className="space-y-4 max-w-lg pt-2">
              <div className="space-y-2">
                <Label htmlFor="statutoryDeductionTiming">Statutory Deduction Timing (SSS, PhilHealth, Pag-IBIG)</Label>
                <Select
                  value={formData.statutoryDeductionTiming}
                  onValueChange={(val) => {
                    if (val) {
                      setFormData((prev) => ({
                        ...prev,
                        statutoryDeductionTiming: val as "FIRST_HALF" | "SECOND_HALF" | "SPLIT",
                      }));
                    }
                  }}
                >
                  <SelectTrigger id="statutoryDeductionTiming">
                    <SelectValue placeholder="Select statutory deduction timing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SECOND_HALF">2nd Half Cutoff (Default — Deduct 100% on 16th–End)</SelectItem>
                    <SelectItem value="FIRST_HALF">1st Half Cutoff (Deduct 100% on 1st–15th)</SelectItem>
                    <SelectItem value="SPLIT">Split 50% / 50% (Deduct half on 1st half, half on 2nd half)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Controls when SSS, PhilHealth, and Pag-IBIG contributions are deducted during semi-monthly payroll runs.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="basicPayFrequency">Basic Pay Period Frequency</Label>
                <Select
                  value={formData.basicPayFrequency}
                  onValueChange={(val) => {
                    if (val) {
                      setFormData((prev) => ({
                        ...prev,
                        basicPayFrequency: val as "TWICE_A_MONTH" | "ONCE_A_MONTH_SECOND_HALF" | "ONCE_A_MONTH_FIRST_HALF",
                      }));
                    }
                  }}
                >
                  <SelectTrigger id="basicPayFrequency">
                    <SelectValue placeholder="Select basic pay frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TWICE_A_MONTH">Twice a Month (Default — Split 50/50 per cutoff)</SelectItem>
                    <SelectItem value="ONCE_A_MONTH_SECOND_HALF">Once a Month — 2nd Half Cutoff (16th–End)</SelectItem>
                    <SelectItem value="ONCE_A_MONTH_FIRST_HALF">Once a Month — 1st Half Cutoff (1st–15th)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Controls whether monthly-rate basic salary is paid twice a month (split per cutoff) or once a month.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="allowancePayFrequency">Allowance Pay Period Frequency</Label>
                <Select
                  value={formData.allowancePayFrequency}
                  onValueChange={(val) => {
                    if (val) {
                      setFormData((prev) => ({
                        ...prev,
                        allowancePayFrequency: val as "TWICE_A_MONTH" | "ONCE_A_MONTH_SECOND_HALF" | "ONCE_A_MONTH_FIRST_HALF",
                      }));
                    }
                  }}
                >
                  <SelectTrigger id="allowancePayFrequency">
                    <SelectValue placeholder="Select allowance pay frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TWICE_A_MONTH">Twice a Month (Default — Divide monthly allowances 50/50 per cutoff)</SelectItem>
                    <SelectItem value="ONCE_A_MONTH_SECOND_HALF">Once a Month — 2nd Half Cutoff (16th–End)</SelectItem>
                    <SelectItem value="ONCE_A_MONTH_FIRST_HALF">Once a Month — 1st Half Cutoff (1st–15th)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Controls whether monthly allowances are paid twice a month (split per cutoff) or once a month.
                </p>
              </div>

              {company.bossKeyIncludeOtherCompanyAllowances && (
                <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
                  <div className="space-y-0.5 max-w-md">
                    <Label htmlFor="includeOtherCompanyAllowancesInContributions" className="text-xs font-semibold cursor-pointer">
                      Include allowances paid by other companies in statutory contribution computations
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      When unselected (default), allowances paid by a different company will be excluded when calculating SSS, Pag-IBIG, and PhilHealth contribution bases for {company.legalName}.
                    </p>
                  </div>
                  <Switch
                    id="includeOtherCompanyAllowancesInContributions"
                    checked={formData.includeOtherCompanyAllowancesInContributions}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        includeOtherCompanyAllowancesInContributions: checked,
                      }))
                    }
                  />
                </div>
              )}

              {company.bossKeyWaiveMandatoryMpfWisp && (
                <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
                  <div className="space-y-0.5 max-w-md">
                    <Label htmlFor="waiveMandatoryMpfWisp" className="text-xs font-semibold cursor-pointer">
                      Waive Mandatory SSS MPF / WISP Contribution
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      When enabled, the SSS Mandatory Provident Fund (MPF/WISP) portion for salary credits above ₱14,750 is waived, calculating only regular SSS contributions for {company.legalName}. Off by default.
                    </p>
                  </div>
                  <Switch
                    id="waiveMandatoryMpfWisp"
                    checked={formData.waiveMandatoryMpfWisp}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        waiveMandatoryMpfWisp: checked,
                      }))
                    }
                  />
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleSaveSettings()} disabled={submitting}>
              {submitting ? "Saving..." : "Save Pay Period Rules"}
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>

      {/* Attendance & Shift Rules Tab */}
      <TabsContent value="attendance" className="space-y-6">
        <Card className="border-slate-200/90 shadow-xs dark:border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ClockIcon className="size-4 text-blue-600" /> Attendance &amp; Shift Schedule Rules
            </CardTitle>
            <CardDescription className="text-xs">
              Configure company-wide shift parameters, grace periods, and flexi windows for {company.legalName}. These parameters drive automated time, late, undertime, and overtime calculations on timesheets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 rounded-lg border p-4">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <ClockIcon className="size-4 text-primary" /> Regular Schedule Shift Rules
              </h4>
              <p className="text-xs text-muted-foreground">
                Rules for employees on Regular schedule (e.g. Standard 8-hour shift + 1-hour lunch break).
              </p>
              <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
                <div className="space-y-1">
                  <Label htmlFor="attendanceStandardTimeIn" className="text-xs">Standard Shift Time-In</Label>
                  <Input
                    id="attendanceStandardTimeIn"
                    type="time"
                    value={formData.attendanceStandardTimeIn}
                    onChange={(e) => setFormData({ ...formData, attendanceStandardTimeIn: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="attendanceStandardTimeOut" className="text-xs">Standard Shift Time-Out</Label>
                  <Input
                    id="attendanceStandardTimeOut"
                    type="time"
                    value={formData.attendanceStandardTimeOut}
                    onChange={(e) => setFormData({ ...formData, attendanceStandardTimeOut: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="attendanceLateGracePeriodMinutes" className="text-xs">Late Grace Period (Minutes)</Label>
                  <Input
                    id="attendanceLateGracePeriodMinutes"
                    type="number"
                    min={0}
                    max={120}
                    value={formData.attendanceLateGracePeriodMinutes}
                    onChange={(e) => setFormData({ ...formData, attendanceLateGracePeriodMinutes: Number(e.target.value) })}
                  />
                  <p className="text-[11px] text-muted-foreground">If time-in $\le$ grace period, 0 late. If exceeded, full late time is deducted from shift start.</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="attendanceOtGracePeriodMinutes" className="text-xs">Overtime Grace Period (Minutes)</Label>
                  <Input
                    id="attendanceOtGracePeriodMinutes"
                    type="number"
                    min={0}
                    max={120}
                    value={formData.attendanceOtGracePeriodMinutes}
                    onChange={(e) => setFormData({ ...formData, attendanceOtGracePeriodMinutes: Number(e.target.value) })}
                  />
                  <p className="text-[11px] text-muted-foreground">Overtime starts when employee stays past shift end by more than this grace period.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <ClockIcon className="size-4 text-primary" /> Flexi1 Schedule Rules
              </h4>
              <p className="text-xs text-muted-foreground">
                Flexible schedule requiring 9 hours total span (8 work hours + 1 hour lunch). Flexi1 employees do not receive overtime.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
                <div className="space-y-1">
                  <Label htmlFor="attendanceFlexi1WindowStart" className="text-xs">Flexi1 Login Window Start</Label>
                  <Input
                    id="attendanceFlexi1WindowStart"
                    type="time"
                    value={formData.attendanceFlexi1WindowStart}
                    onChange={(e) => setFormData({ ...formData, attendanceFlexi1WindowStart: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">Earliest time the 9-hour work timer can start.</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="attendanceFlexi1WindowEnd" className="text-xs">Flexi1 Login Window End</Label>
                  <Input
                    id="attendanceFlexi1WindowEnd"
                    type="time"
                    value={formData.attendanceFlexi1WindowEnd}
                    onChange={(e) => setFormData({ ...formData, attendanceFlexi1WindowEnd: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">Latest allowed login time before late minutes begin accumulating.</p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="attendanceFlexi1LateGracePeriodMinutes" className="text-xs">Late Grace Period (Minutes)</Label>
                  <Input
                    id="attendanceFlexi1LateGracePeriodMinutes"
                    type="number"
                    min={0}
                    max={120}
                    value={formData.attendanceFlexi1LateGracePeriodMinutes}
                    onChange={(e) => setFormData({ ...formData, attendanceFlexi1LateGracePeriodMinutes: Number(e.target.value) })}
                    className="max-w-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">If time-in &le; window end + grace period, 0 late. If exceeded, full late time is deducted from window end.</p>
                </div>
              </div>
            </div>

            {/* Saturday Shift Schedule Rules */}
            <div className="space-y-4 rounded-lg border p-4 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <ClockIcon className="size-4 text-primary" /> Saturday Shift Schedule Rules
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Custom shift rules dedicated for Saturdays. Employees following this rule have flexible login (7:30 AM – 10:30 AM), a 5-hour shift, and customized grace period.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="attendanceSaturdayRuleEnabled" className="text-xs font-medium cursor-pointer">
                    {formData.attendanceSaturdayRuleEnabled ? "Active" : "Disabled"}
                  </Label>
                  <Switch
                    id="attendanceSaturdayRuleEnabled"
                    checked={formData.attendanceSaturdayRuleEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, attendanceSaturdayRuleEnabled: checked })}
                  />
                </div>
              </div>

              {formData.attendanceSaturdayRuleEnabled && (
                <div className="space-y-4 pt-2">
                  <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
                    <div className="space-y-1">
                      <Label htmlFor="attendanceSaturdayWindowStart" className="text-xs">Saturday Login Window Start</Label>
                      <Input
                        id="attendanceSaturdayWindowStart"
                        type="time"
                        value={formData.attendanceSaturdayWindowStart}
                        onChange={(e) => setFormData({ ...formData, attendanceSaturdayWindowStart: e.target.value })}
                      />
                      <p className="text-[11px] text-muted-foreground">Earliest allowed login time (default 07:30 AM).</p>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="attendanceSaturdayWindowEnd" className="text-xs">Saturday Login Window End</Label>
                      <Input
                        id="attendanceSaturdayWindowEnd"
                        type="time"
                        value={formData.attendanceSaturdayWindowEnd}
                        onChange={(e) => setFormData({ ...formData, attendanceSaturdayWindowEnd: e.target.value })}
                      />
                      <p className="text-[11px] text-muted-foreground">Latest regular login window (default 10:30 AM).</p>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="attendanceSaturdayGracePeriodMinutes" className="text-xs">Late Grace Period (Minutes)</Label>
                      <Input
                        id="attendanceSaturdayGracePeriodMinutes"
                        type="number"
                        min={0}
                        max={120}
                        value={formData.attendanceSaturdayGracePeriodMinutes}
                        onChange={(e) => setFormData({ ...formData, attendanceSaturdayGracePeriodMinutes: Number(e.target.value) })}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Default 10 mins. If arrived by 10:35 AM = 0 late; if 10:41 AM = 11 mins late.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="attendanceSaturdayShiftHours" className="text-xs">Shift Duration (Hours)</Label>
                      <Input
                        id="attendanceSaturdayShiftHours"
                        type="number"
                        step="0.5"
                        min={1}
                        max={12}
                        value={formData.attendanceSaturdayShiftHours}
                        onChange={(e) => setFormData({ ...formData, attendanceSaturdayShiftHours: Number(e.target.value) })}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Default 5.0 hours. Undertime is deducted if worked shift is less than 5 hours.
                      </p>
                    </div>
                  </div>

                  {/* Employee Selection for Saturday Rule */}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-semibold">Employees Following Saturday Rule</Label>
                        <p className="text-[11px] text-muted-foreground">
                          Choose which active employees follow this Saturday schedule. If none are selected, it applies to all active employees by default.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => {
                            const activeIds = employees
                              .filter((e) => e.employmentStatus === "REGULAR" || e.employmentStatus === "PROBATIONARY" || e.employmentStatus === "RETAINER")
                              .map((e) => e.id);
                            setFormData({ ...formData, attendanceSaturdayEmployeeIds: activeIds });
                          }}
                        >
                          Select All Active
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 text-muted-foreground"
                          onClick={() => setFormData({ ...formData, attendanceSaturdayEmployeeIds: [] })}
                        >
                          Clear (All Follow)
                        </Button>
                      </div>
                    </div>

                    <div className="max-h-48 overflow-y-auto border rounded-md p-2 bg-background space-y-1.5">
                      {employees
                        .filter((e) => e.employmentStatus === "REGULAR" || e.employmentStatus === "PROBATIONARY" || e.employmentStatus === "RETAINER")
                        .map((emp) => {
                          const isChecked = (formData.attendanceSaturdayEmployeeIds || []).includes(emp.id);
                          return (
                            <div
                              key={emp.id}
                              className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer text-xs"
                              onClick={() => {
                                const current = formData.attendanceSaturdayEmployeeIds || [];
                                const next = current.includes(emp.id)
                                  ? current.filter((id) => id !== emp.id)
                                  : [...current, emp.id];
                                setFormData({ ...formData, attendanceSaturdayEmployeeIds: next });
                              }}
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => {}}
                              />
                              <span className="font-medium">{emp.lastName}, {emp.firstName}</span>
                              <span className="text-muted-foreground font-mono">({emp.employeeNumber})</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Special Occasion / Day Schedule Overrides */}
            <div className="space-y-4 rounded-lg border p-4 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <CalendarDaysIcon className="size-4 text-amber-600" /> Special Occasion / Day Schedule Overrides
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Override regular time-in for specific dates (e.g. Town Hall Meeting, Christmas Party, Special Assemblies) without changing default shift settings.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-8"
                  onClick={() => setSpecialScheduleDialogOpen(true)}
                >
                  <PlusCircleIcon className="size-3.5" /> Add Special Day
                </Button>
              </div>

              {loadingSpecial ? (
                <p className="text-xs text-muted-foreground py-2">Loading special schedules...</p>
              ) : specialSchedules.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center border border-dashed rounded-md bg-background">
                  No special day overrides configured yet. Click &quot;Add Special Day&quot; to create one.
                </p>
              ) : (
                <div className="border rounded-md overflow-hidden bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-[11px] font-semibold bg-muted/40">
                        <TableHead>Date</TableHead>
                        <TableHead>Occasion / Title</TableHead>
                        <TableHead>Time In</TableHead>
                        <TableHead>Time Out</TableHead>
                        <TableHead>Grace Period</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {specialSchedules.map((s) => (
                        <TableRow key={s.id} className="text-xs">
                          <TableCell className="font-semibold">{new Date(s.workDate).toISOString().slice(0, 10)}</TableCell>
                          <TableCell>{s.title}</TableCell>
                          <TableCell className="font-mono">{s.standardTimeIn}</TableCell>
                          <TableCell className="font-mono">{s.standardTimeOut || "Standard"}</TableCell>
                          <TableCell>{s.lateGracePeriodMinutes} mins</TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="size-7 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteSpecialSchedule(s.id)}
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className="space-y-2 max-w-xs">
              <Label htmlFor="attendanceLunchBreakMinutes" className="text-xs">Default Lunch Break (Minutes)</Label>
              <Input
                id="attendanceLunchBreakMinutes"
                type="number"
                min={0}
                max={480}
                value={formData.attendanceLunchBreakMinutes}
                onChange={(e) => setFormData({ ...formData, attendanceLunchBreakMinutes: Number(e.target.value) })}
              />
              <p className="text-[11px] text-muted-foreground">Default break deducted for standard shifts (default 60 mins / 1.0 hr).</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveSettings} disabled={submitting}>
              {submitting ? "Saving..." : "Save Attendance Rules"}
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>

      {/* 2. Payroll Banks Tab */}
      {isSuperAdmin && (
        <TabsContent value="banks" className="space-y-6">
          <Card className="border-slate-200/90 shadow-xs dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <LandmarkIcon className="size-4 text-blue-600" /> Company Payroll Bank Accounts
                </CardTitle>
                <CardDescription className="text-xs">
                  Define bank accounts used by {company.legalName} for payroll disbursement. These accounts generate the Bank Advice Report and CSV download per pay period.
                </CardDescription>
              </div>

              <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
                <DialogTrigger render={<Button size="sm" className="gap-1.5 text-xs font-semibold" />}>
                  <PlusCircleIcon className="size-3.5" /> Add Bank Account
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Payroll Bank Account</DialogTitle>
                    <DialogDescription>
                      Enter the company bank account details for payroll advice generation.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddBankAccount} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        placeholder="e.g. BDO, BPI, Metrobank, UnionBank"
                        value={newBank.bankName}
                        onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="bankNickname">Account Nickname (Optional)</Label>
                      <Input
                        id="bankNickname"
                        placeholder="e.g. Main Payroll Account, Allowance BPI"
                        value={newBank.nickname}
                        onChange={(e) => setNewBank({ ...newBank, nickname: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="accountNumber">Company Account Number</Label>
                      <Input
                        id="accountNumber"
                        placeholder="e.g. 001234567890"
                        value={newBank.accountNumber}
                        onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="accountName">Company Account Name</Label>
                      <Input
                        id="accountName"
                        value={newBank.accountName}
                        onChange={(e) => setNewBank({ ...newBank, accountName: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="branchName">Branch Name (Optional)</Label>
                        <Input
                          id="branchName"
                          placeholder="e.g. Makati Main Branch"
                          value={newBank.branchName}
                          onChange={(e) => setNewBank({ ...newBank, branchName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="swiftCode">Bank / SWIFT Code (Optional)</Label>
                        <Input
                          id="swiftCode"
                          placeholder="e.g. BNORPHMM"
                          value={newBank.swiftCode}
                          onChange={(e) => setNewBank({ ...newBank, swiftCode: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Switch
                        id="isDefaultBank"
                        checked={newBank.isDefault}
                        onCheckedChange={(v) => setNewBank({ ...newBank, isDefault: v })}
                      />
                      <Label htmlFor="isDefaultBank" className="text-xs">
                        Set as primary default disbursing bank account for this company
                      </Label>
                    </div>

                    <DialogFooter className="pt-2">
                      <Button type="submit" disabled={submitting}>
                        {submitting ? "Adding..." : "Save Bank Account"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              {bankAccounts.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground space-y-2">
                  <LandmarkIcon className="size-8 mx-auto text-muted-foreground/50" />
                  <p>No bank accounts configured for this company yet.</p>
                  <p className="text-xs">Click &quot;Add Bank Account&quot; above to register your disbursing bank.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800">
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Bank Name</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Account Number</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Account Name</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Branch / SWIFT</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Default</TableHead>
                      <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankAccounts.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-semibold flex items-center gap-2">
                          <LandmarkIcon className="size-4 text-primary shrink-0" />
                          <div>
                            <span>{b.bankName}</span>
                            {b.nickname && (
                              <span className="block text-xs font-normal text-muted-foreground">{b.nickname}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{b.accountNumber}</TableCell>
                        <TableCell>{b.accountName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {b.branchName || "—"} {b.swiftCode ? `(${b.swiftCode})` : ""}
                        </TableCell>
                        <TableCell>
                          {b.isDefault ? (
                            <Badge variant="default" className="gap-1 bg-amber-500 text-amber-950 font-semibold">
                              <StarIcon className="size-3 fill-current" /> Primary Default
                            </Badge>
                          ) : (
                            <Badge variant="outline">Secondary</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!b.isDefault && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                                onClick={() => handleSetDefaultBank(b.id)}
                              >
                                Make Default
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteBank(b.id)}
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      )}

      {/* 3. Company Details Tab */}
      {isSuperAdmin && (
        <TabsContent value="company-details" className="space-y-6">
          <Card className="border-slate-200/90 shadow-xs dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2Icon className="size-4 text-blue-600" /> Company Details &amp; Tax Registration
              </CardTitle>
              <CardDescription className="text-xs">
                Official registration identifiers for BIR Form 1601-C, 2316, Form 2307, SSS R-3, PhilHealth RF-1, and Pag-IBIG filings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="legalName">Legal Name</Label>
                  <Input
                    id="legalName"
                    value={formData.legalName}
                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tradeName">Trade Name (Optional)</Label>
                  <Input
                    id="tradeName"
                    value={formData.tradeName}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tin">Tax Identification Number (TIN)</Label>
                  <Input
                    id="tin"
                    value={formData.tin}
                    onChange={(e) => setFormData({ ...formData, tin: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="rdoCode">Revenue District Office (RDO Code)</Label>
                  <Input
                    id="rdoCode"
                    value={formData.rdoCode}
                    onChange={(e) => setFormData({ ...formData, rdoCode: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="sssEmployerNumber">SSS Employer Number</Label>
                  <Input
                    id="sssEmployerNumber"
                    value={formData.sssEmployerNumber}
                    onChange={(e) => setFormData({ ...formData, sssEmployerNumber: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="philhealthEmployerNumber">PhilHealth Employer Number</Label>
                  <Input
                    id="philhealthEmployerNumber"
                    value={formData.philhealthEmployerNumber}
                    onChange={(e) => setFormData({ ...formData, philhealthEmployerNumber: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="pagibigEmployerId">Pag-IBIG Employer ID</Label>
                  <Input
                    id="pagibigEmployerId"
                    value={formData.pagibigEmployerId}
                    onChange={(e) => setFormData({ ...formData, pagibigEmployerId: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="region">Region</Label>
                  <Input
                    id="region"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <Label htmlFor="registeredAddress">Registered Address</Label>
                <Input
                  id="registeredAddress"
                  value={formData.registeredAddress}
                  onChange={(e) => setFormData({ ...formData, registeredAddress: e.target.value })}
                />
              </div>
            </CardContent>
            <CardFooter className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button onClick={handleSaveSettings} disabled={submitting}>
                {submitting ? "Saving..." : "Save Company Details"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      )}

      {/* 4. BIR Alphalist Employee Selection Tab */}
      {isSuperAdmin && (
        <TabsContent value="alphalist" className="space-y-6">
          <Card className="border-slate-200/90 shadow-xs dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UsersIcon className="size-4 text-blue-600" /> BIR Alphalist (Form 1604-C) Employee Selection
              </CardTitle>
              <CardDescription className="text-xs">
                Select which employees are included in the annual BIR Alphalist report for {company.legalName}. Employees toggled OFF will be excluded from the generated PDF.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {employees.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No employees found in directory.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800">
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Employee #</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Name</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">TIN</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</TableHead>
                      <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Include in Alphalist</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <TableCell className="font-mono text-xs font-semibold">{emp.employeeNumber}</TableCell>
                        <TableCell className="font-medium text-xs text-slate-900 dark:text-slate-100">
                          {emp.lastName}, {emp.firstName}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{emp.tin || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">{emp.employmentStatus}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Switch
                              checked={emp.isIncludedInAlphalist}
                              onCheckedChange={() => handleToggleAlphalist(emp.id, emp.isIncludedInAlphalist)}
                            />
                            <span className="text-xs text-slate-500 w-14 text-left">
                              {emp.isIncludedInAlphalist ? "Included" : "Excluded"}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      )}

      {/* 5. Theme & Appearance Tab */}
      <TabsContent value="theme" className="space-y-6">
        <Card className="border-slate-200/90 shadow-xs dark:border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PaletteIcon className="size-4 text-blue-600" /> Appearance &amp; Theme Mode
            </CardTitle>
            <CardDescription className="text-xs">Customize the visual interface theme of the application.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 max-w-md">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  theme === "light" ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"
                }`}
              >
                <SunIcon className="size-6" />
                <span className="text-xs font-semibold">Light</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  theme === "dark" ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"
                }`}
              >
                <MoonIcon className="size-6" />
                <span className="text-xs font-semibold">Dark</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  theme === "system" ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"
                }`}
              >
                <MonitorIcon className="size-6" />
                <span className="text-xs font-semibold">System</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <Dialog open={confirmWorkDaysDialogOpen} onOpenChange={setConfirmWorkDaysDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply Standard Work Days to Employees?</DialogTitle>
          <DialogDescription>
            You changed the standard work days per month from <strong>{company.standardWorkDaysPerMonth}</strong> to <strong>{formData.standardWorkDaysPerMonth}</strong> days.
            <br /><br />
            Would you like to apply this new standard work days value to all active employee compensation records?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => handleSaveSettings(false)} disabled={submitting}>
            Update Company Only
          </Button>
          <Button onClick={() => handleSaveSettings(true)} disabled={submitting}>
            {submitting ? "Saving..." : "Apply to All Employees & Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={specialScheduleDialogOpen} onOpenChange={setSpecialScheduleDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDaysIcon className="size-5 text-amber-600" />
            Add Special Day Schedule Override
          </DialogTitle>
          <DialogDescription>
            Define a date-specific schedule (e.g. Town Hall Meeting, Christmas Party, Company Event) so attendance calculates using these adjusted shift hours instead of standard defaults.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="specialDate" className="text-xs font-semibold">Date *</Label>
            <Input
              id="specialDate"
              type="date"
              value={specialDate}
              onChange={(e) => setSpecialDate(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="specialTitle" className="text-xs font-semibold">Occasion / Title *</Label>
            <Input
              id="specialTitle"
              placeholder="e.g. Town Hall Meeting, Christmas Party"
              value={specialTitle}
              onChange={(e) => setSpecialTitle(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="specialTimeIn" className="text-xs font-semibold">Time In *</Label>
              <Input
                id="specialTimeIn"
                type="time"
                value={specialTimeIn}
                onChange={(e) => setSpecialTimeIn(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="specialTimeOut" className="text-xs font-semibold">Time Out</Label>
              <Input
                id="specialTimeOut"
                type="time"
                value={specialTimeOut}
                onChange={(e) => setSpecialTimeOut(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="specialGrace" className="text-xs font-semibold">Late Grace (mins)</Label>
              <Input
                id="specialGrace"
                type="number"
                min="0"
                value={specialGrace}
                onChange={(e) => setSpecialGrace(Number(e.target.value))}
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="specialBreak" className="text-xs font-semibold">Break (mins)</Label>
              <Input
                id="specialBreak"
                type="number"
                min="0"
                value={specialBreak}
                onChange={(e) => setSpecialBreak(Number(e.target.value))}
                className="text-xs font-mono"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSpecialScheduleDialogOpen(false)}
            disabled={savingSpecial}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCreateSpecialSchedule}
            disabled={savingSpecial}
          >
            {savingSpecial ? "Saving..." : "Save Special Day"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
