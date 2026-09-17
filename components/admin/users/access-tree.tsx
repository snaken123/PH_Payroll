"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  Building2Icon,
  ShieldAlertIcon,
  UsersIcon,
  ClockIcon,
  PalmtreeIcon,
  BanknoteIcon,
  WalletIcon,
  FileTextIcon,
  BriefcaseIcon,
  SparklesIcon,
} from "lucide-react";
import {
  PERMISSION_CATEGORIES,
  PERMISSION_PRESETS,
  ALL_PERMISSIONS,
} from "@/lib/permissions";

export interface CompanyOption {
  id: string;
  legalName: string;
  companyCode: string;
}

export interface AccessTreeMembership {
  companyId: string;
  role: "COMPANY_OWNER" | "PAYROLL_ADMIN" | "HR_STAFF" | "APPROVER" | "EMPLOYEE";
  permissions: string[];
}

interface AccessTreeProps {
  platformRole: "STANDARD" | "SUPER_ADMIN";
  onPlatformRoleChange: (role: "STANDARD" | "SUPER_ADMIN") => void;
  companies: CompanyOption[];
  memberships: AccessTreeMembership[];
  onMembershipsChange: (memberships: AccessTreeMembership[]) => void;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  employee: UsersIcon,
  attendance: ClockIcon,
  leave: PalmtreeIcon,
  loans: BanknoteIcon,
  payroll: WalletIcon,
  reports: FileTextIcon,
  contractors: BriefcaseIcon,
};

export function AccessTree({
  platformRole,
  onPlatformRoleChange,
  companies,
  memberships,
  onMembershipsChange,
}: AccessTreeProps) {
  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const m of memberships) init[m.companyId] = true;
    return init;
  });

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const c of PERMISSION_CATEGORIES) init[c.id] = true;
    return init;
  });

  const toggleCompanyExpand = (companyId: string) => {
    setExpandedCompanies((prev) => ({ ...prev, [companyId]: !prev[companyId] }));
  };

  const toggleCategoryExpand = (categoryId: string) => {
    setExpandedCategories((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  const isCompanySelected = (companyId: string) => memberships.some((m) => m.companyId === companyId);

  const getCompanyMembership = (companyId: string) => memberships.find((m) => m.companyId === companyId);

  const toggleCompanySelection = (companyId: string, checked: boolean) => {
    if (checked) {
      const existing = getCompanyMembership(companyId);
      if (!existing) {
        onMembershipsChange([
          ...memberships,
          { companyId, role: "HR_STAFF", permissions: [...ALL_PERMISSIONS] },
        ]);
        setExpandedCompanies((prev) => ({ ...prev, [companyId]: true }));
      }
    } else {
      onMembershipsChange(memberships.filter((m) => m.companyId !== companyId));
    }
  };

  const updateCompanyPermissions = (companyId: string, newPermissions: string[]) => {
    onMembershipsChange(
      memberships.map((m) => (m.companyId === companyId ? { ...m, permissions: newPermissions } : m))
    );
  };

  const toggleSinglePermission = (companyId: string, key: string, checked: boolean) => {
    const m = getCompanyMembership(companyId);
    if (!m) return;
    const current = m.permissions ?? [];
    const next = checked ? [...new Set([...current, key])] : current.filter((k) => k !== key);
    updateCompanyPermissions(companyId, next);
  };

  const toggleCategoryPermissions = (companyId: string, categoryId: string, checked: boolean) => {
    const m = getCompanyMembership(companyId);
    if (!m) return;
    const category = PERMISSION_CATEGORIES.find((c) => c.id === categoryId);
    if (!category) return;
    const catKeys = category.items.map((i) => i.key);
    const current = new Set(m.permissions ?? []);
    if (checked) {
      catKeys.forEach((k) => current.add(k));
    } else {
      catKeys.forEach((k) => current.delete(k));
    }
    updateCompanyPermissions(companyId, [...current]);
  };

  const applyPresetToCompany = (companyId: string, presetKey: string) => {
    const preset = PERMISSION_PRESETS[presetKey];
    if (!preset) return;
    updateCompanyPermissions(companyId, [...preset.permissions]);
  };

  const applyPresetToAllCompanies = (presetKey: string) => {
    const preset = PERMISSION_PRESETS[presetKey];
    if (!preset) return;
    onMembershipsChange(
      memberships.map((m) => ({
        ...m,
        permissions: [...preset.permissions],
      }))
    );
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-slate-100">
      {/* STEP 1: Platform Level Role */}
      <div className="space-y-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldAlertIcon className="size-4 text-amber-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Step 1: Platform Level Role
          </h4>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onPlatformRoleChange("STANDARD")}
            className={`flex flex-col items-start p-3 rounded-lg border text-left transition-colors ${
              platformRole === "STANDARD"
                ? "bg-blue-950/60 border-blue-500/80 text-white"
                : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold">Standard User</span>
              {platformRole === "STANDARD" && <Badge variant="default" className="text-[10px] bg-blue-600">Active</Badge>}
            </div>
            <span className="text-[10px] text-slate-400 mt-1">
              Access is restricted to explicitly assigned companies &amp; checked feature tree permissions.
            </span>
          </button>

          <button
            type="button"
            onClick={() => onPlatformRoleChange("SUPER_ADMIN")}
            className={`flex flex-col items-start p-3 rounded-lg border text-left transition-colors ${
              platformRole === "SUPER_ADMIN"
                ? "bg-amber-950/60 border-amber-500/80 text-white"
                : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-amber-300">Platform Super Admin</span>
              {platformRole === "SUPER_ADMIN" && <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-400">Full Access</Badge>}
            </div>
            <span className="text-[10px] text-slate-400 mt-1">
              Unrestricted access to all companies, platform user creation, tenant provisioning, and statutory settings.
            </span>
          </button>
        </div>
      </div>

      {/* STEP 2: Company Access & Granular Functionality Tree */}
      {platformRole === "STANDARD" && (
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2Icon className="size-4 text-blue-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Step 2: Company Access &amp; Functionality Tree
              </h4>
            </div>

            {memberships.length > 0 && (
              <div className="flex items-center gap-1.5">
                <SparklesIcon className="size-3 text-amber-400" />
                <span className="text-[10px] text-slate-400 font-mono">Quick Presets:</span>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="text-[10px] h-6 px-1.5 border-slate-700"
                  onClick={() => applyPresetToAllCompanies("FULL_ADMIN")}
                >
                  Full Admin
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="text-[10px] h-6 px-1.5 border-slate-700"
                  onClick={() => applyPresetToAllCompanies("HR_ADMIN_NO_PAY")}
                >
                  HR (No Pay)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="text-[10px] h-6 px-1.5 border-slate-700"
                  onClick={() => applyPresetToAllCompanies("ATTENDANCE_ONLY")}
                >
                  Attendance Only
                </Button>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-400">
            Check a company to grant access, then expand its tree to configure exact feature-level checkboxes.
          </p>

          <div className="space-y-3">
            {companies.map((company) => {
              const selected = isCompanySelected(company.id);
              const isExpanded = !!expandedCompanies[company.id];
              const membership = getCompanyMembership(company.id);
              const activePerms = membership?.permissions ?? [];

              return (
                <div
                  key={company.id}
                  className={`rounded-lg border transition-all ${
                    selected
                      ? "border-blue-500/50 bg-slate-950/60"
                      : "border-slate-800 bg-slate-950/20 opacity-70 hover:opacity-100"
                  }`}
                >
                  {/* Company Level Header */}
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      {selected && (
                        <button
                          type="button"
                          onClick={() => toggleCompanyExpand(company.id)}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                          {isExpanded ? (
                            <ChevronDownIcon className="size-4 text-blue-400" />
                          ) : (
                            <ChevronRightIcon className="size-4 text-slate-400" />
                          )}
                        </button>
                      )}
                      <Checkbox
                        id={`company-${company.id}`}
                        checked={selected}
                        onCheckedChange={(checked) => toggleCompanySelection(company.id, !!checked)}
                      />
                      <Label
                        htmlFor={`company-${company.id}`}
                        className="text-xs font-bold cursor-pointer text-slate-200"
                      >
                        {company.legalName}{" "}
                        <span className="text-[10px] font-mono text-slate-500">
                          ({company.companyCode})
                        </span>
                      </Label>
                    </div>

                    {selected && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] border-blue-500/40 text-blue-300">
                          {activePerms.length} / {ALL_PERMISSIONS.length} Permissions
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Expandable Granular Functionality Tree */}
                  {selected && isExpanded && (
                    <div className="border-t border-slate-800/80 p-3 bg-slate-950/80 space-y-3 pl-6">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Functionality Permissions Tree
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-slate-500">Presets for this company:</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            className="text-[9px] h-5 px-1.5 text-blue-400 hover:text-white"
                            onClick={() => applyPresetToCompany(company.id, "FULL_ADMIN")}
                          >
                            All Access
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            className="text-[9px] h-5 px-1.5 text-amber-400 hover:text-white"
                            onClick={() => applyPresetToCompany(company.id, "HR_ADMIN_NO_PAY")}
                          >
                            HR (No Pay)
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            className="text-[9px] h-5 px-1.5 text-emerald-400 hover:text-white"
                            onClick={() => applyPresetToCompany(company.id, "ATTENDANCE_ONLY")}
                          >
                            Attendance Only
                          </Button>
                        </div>
                      </div>

                      {PERMISSION_CATEGORIES.map((cat) => {
                        const catExpanded = !!expandedCategories[cat.id];
                        const Icon = CATEGORY_ICONS[cat.id] || UsersIcon;
                        const catKeys = cat.items.map((i) => i.key);
                        const checkedCount = catKeys.filter((k) => activePerms.includes(k)).length;
                        const isAllCatChecked = checkedCount === catKeys.length;
                        const isSomeCatChecked = checkedCount > 0 && !isAllCatChecked;

                        return (
                          <div key={cat.id} className="rounded-md border border-slate-800/60 bg-slate-900/60">
                            {/* Category Header */}
                            <div className="flex items-center justify-between p-2.5 bg-slate-900/80 rounded-t-md">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleCategoryExpand(cat.id)}
                                  className="p-0.5 rounded text-slate-400 hover:text-white"
                                >
                                  {catExpanded ? (
                                    <ChevronDownIcon className="size-3.5" />
                                  ) : (
                                    <ChevronRightIcon className="size-3.5" />
                                  )}
                                </button>
                                <Checkbox
                                  id={`cat-${company.id}-${cat.id}`}
                                  checked={isAllCatChecked}
                                  onCheckedChange={(checked) =>
                                    toggleCategoryPermissions(company.id, cat.id, !!checked)
                                  }
                                />
                                <Label
                                  htmlFor={`cat-${company.id}-${cat.id}`}
                                  className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-slate-200"
                                >
                                  <Icon className="size-3.5 text-blue-400" />
                                  {cat.title}
                                </Label>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">
                                {checkedCount}/{catKeys.length}
                              </span>
                            </div>

                            {/* Category Items */}
                            {catExpanded && (
                              <div className="p-2.5 pt-1.5 space-y-2 border-t border-slate-800/40 bg-slate-950/40 pl-8">
                                {cat.items.map((item) => {
                                  const isChecked = activePerms.includes(item.key);
                                  return (
                                    <div key={item.key} className="flex items-start gap-2.5 pt-1">
                                      <Checkbox
                                        id={`perm-${company.id}-${item.key}`}
                                        checked={isChecked}
                                        onCheckedChange={(checked) =>
                                          toggleSinglePermission(company.id, item.key, !!checked)
                                        }
                                        className="mt-0.5"
                                      />
                                      <div className="space-y-0.5">
                                        <Label
                                          htmlFor={`perm-${company.id}-${item.key}`}
                                          className="text-xs font-medium cursor-pointer text-slate-300 hover:text-white"
                                        >
                                          {item.label}
                                        </Label>
                                        <p className="text-[10px] text-slate-500">
                                          {item.description}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
