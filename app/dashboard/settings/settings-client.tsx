"use client";

import { useState } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDaysIcon,
  Building2Icon,
  PaletteIcon,
  UsersIcon,
  PlusCircleIcon,
  CheckCircle2Icon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
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

export function SettingsClient({
  company,
  employees: initialEmployees,
}: {
  company: CompanyData;
  employees: EmployeeData[];
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState(initialEmployees);

  // Company Pay Period & Details Form State
  const [formData, setFormData] = useState({
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
  });

  // Add Company Form State
  const [newCompany, setNewCompany] = useState({
    companyCode: "",
    legalName: "",
    tradeName: "",
    tin: "",
    rdoCode: "RDO-039",
    registeredAddress: "",
    region: "NCR",
    ownerEmail: "owner@company.local",
    ownerName: "Company Owner",
    ownerPassword: "ChangeMe123!",
  });

  async function handleSaveSettings() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/companies/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.formErrors?.join(", ") ?? body.error ?? "Failed to update settings");
      }

      toast.success("Company settings updated successfully");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
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

  async function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCompany),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to create company");
      }

      toast.success("New company created! Switching context...");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Tabs defaultValue="pay-period" className="space-y-6">
      <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/60 rounded-xl">
        <TabsTrigger value="pay-period" className="flex items-center gap-1.5 text-xs py-2 px-3">
          <CalendarDaysIcon className="size-3.5" /> Pay Period Rules
        </TabsTrigger>
        <TabsTrigger value="company-details" className="flex items-center gap-1.5 text-xs py-2 px-3">
          <Building2Icon className="size-3.5" /> Company Details
        </TabsTrigger>
        <TabsTrigger value="alphalist" className="flex items-center gap-1.5 text-xs py-2 px-3">
          <UsersIcon className="size-3.5" /> BIR Alphalist
        </TabsTrigger>
        <TabsTrigger value="theme" className="flex items-center gap-1.5 text-xs py-2 px-3">
          <PaletteIcon className="size-3.5" /> Appearance
        </TabsTrigger>
        <TabsTrigger value="add-company" className="flex items-center gap-1.5 text-xs py-2 px-3">
          <PlusCircleIcon className="size-3.5" /> Add New Company
        </TabsTrigger>
      </TabsList>

      {/* 1. Pay Period Rules Tab */}
      <TabsContent value="pay-period" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Pay Period Rules</CardTitle>
            <CardDescription>
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
                      cutoff1EndDay: 9,
                      cutoff2StartDay: 10,
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
                    Mid-Month Cycle (10th–25th &amp; 26th–9th)
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

            <div className="space-y-2 max-w-xs">
              <Label htmlFor="payDateOffsetDays">Default Pay Date Offset (Days after cutoff end)</Label>
              <Input
                id="payDateOffsetDays"
                type="number"
                min={0}
                max={30}
                value={formData.payDateOffsetDays}
                onChange={(e) => setFormData({ ...formData, payDateOffsetDays: Number(e.target.value) })}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveSettings} disabled={submitting}>
              {submitting ? "Saving..." : "Save Pay Period Rules"}
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>

      {/* 2. Company Details Tab */}
      <TabsContent value="company-details" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Details &amp; Tax Registration</CardTitle>
            <CardDescription>
              Official registration identifiers for BIR Form 1601-C, 2316, Form 2307, SSS R-3, PhilHealth RF-1, and Pag-IBIG filings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          <CardFooter>
            <Button onClick={handleSaveSettings} disabled={submitting}>
              {submitting ? "Saving..." : "Save Company Details"}
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>

      {/* 3. BIR Alphalist Employee Selection Tab */}
      <TabsContent value="alphalist" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>BIR Alphalist (Form 1604-C) Employee Selection</CardTitle>
            <CardDescription>
              Select which employees are included in the annual BIR Alphalist report for {company.legalName}. Employees toggled OFF will be excluded from the generated PDF.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No employees found in directory.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>TIN</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Include in Alphalist</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono text-xs">{emp.employeeNumber}</TableCell>
                      <TableCell className="font-medium">
                        {emp.lastName}, {emp.firstName}
                      </TableCell>
                      <TableCell>{emp.tin || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{emp.employmentStatus}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Switch
                            checked={emp.isIncludedInAlphalist}
                            onCheckedChange={() => handleToggleAlphalist(emp.id, emp.isIncludedInAlphalist)}
                          />
                          <span className="text-xs text-muted-foreground w-12 text-left">
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

      {/* 4. Theme & Appearance Tab */}
      <TabsContent value="theme" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Appearance &amp; Theme Mode</CardTitle>
            <CardDescription>Customize the visual interface theme of the application.</CardDescription>
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

      {/* 5. Add New Company Tab */}
      <TabsContent value="add-company" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Add New Company Tenant</CardTitle>
            <CardDescription>
              Create a new company account. You will automatically be granted Owner role and can switch active workspace between companies.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleCreateCompany}>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="newCompanyCode">Company Code / ID</Label>
                  <Input
                    id="newCompanyCode"
                    placeholder="e.g. acme-corp"
                    value={newCompany.companyCode}
                    onChange={(e) => setNewCompany({ ...newCompany, companyCode: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="newLegalName">Legal Name</Label>
                  <Input
                    id="newLegalName"
                    placeholder="e.g. Acme Philippines Inc."
                    value={newCompany.legalName}
                    onChange={(e) => setNewCompany({ ...newCompany, legalName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="newTin">Tax Identification Number (TIN)</Label>
                  <Input
                    id="newTin"
                    placeholder="000-000-000-000"
                    value={newCompany.tin}
                    onChange={(e) => setNewCompany({ ...newCompany, tin: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="newRdoCode">RDO Code</Label>
                  <Input
                    id="newRdoCode"
                    value={newCompany.rdoCode}
                    onChange={(e) => setNewCompany({ ...newCompany, rdoCode: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="newRegion">Region</Label>
                  <Input
                    id="newRegion"
                    value={newCompany.region}
                    onChange={(e) => setNewCompany({ ...newCompany, region: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="newRegisteredAddress">Registered Address</Label>
                <Input
                  id="newRegisteredAddress"
                  placeholder="Street, City, Province"
                  value={newCompany.registeredAddress}
                  onChange={(e) => setNewCompany({ ...newCompany, registeredAddress: e.target.value })}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create New Company"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
