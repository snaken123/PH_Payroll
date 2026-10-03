"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Search, Key, Building2, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface CompanyBossKeyData {
  id: string;
  companyCode: string;
  legalName: string;
  tradeName?: string | null;
  status: string;
  bossKeyIncludeOtherCompanyAllowances: boolean;
  bossKeyWaiveMandatoryMpfWisp: boolean;
  bossKeyAllowanceTaxableToggle: boolean;
  includeOtherCompanyAllowancesInContributions: boolean;
  waiveMandatoryMpfWisp: boolean;
  _count: {
    employees: number;
  };
}

interface BossKeysClientProps {
  initialCompanies: CompanyBossKeyData[];
}

export function BossKeysClient({ initialCompanies }: BossKeysClientProps) {
  const [companies, setCompanies] = useState<CompanyBossKeyData[]>(initialCompanies);
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filteredCompanies = companies.filter(
    (c) =>
      c.legalName.toLowerCase().includes(search.toLowerCase()) ||
      c.companyCode.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = async (
    companyId: string,
    field: "bossKeyIncludeOtherCompanyAllowances" | "bossKeyWaiveMandatoryMpfWisp" | "bossKeyAllowanceTaxableToggle",
    newValue: boolean
  ) => {
    setLoadingId(`${companyId}-${field}`);

    // Optimistic UI update
    setCompanies((prev) =>
      prev.map((c) => (c.id === companyId ? { ...c, [field]: newValue } : c))
    );

    try {
      const res = await fetch(`/api/admin/boss-keys/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newValue }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update feature toggle");
      }

      const fieldLabels: Record<string, string> = {
        bossKeyIncludeOtherCompanyAllowances: "Include Other Co. Allowances Toggle",
        bossKeyWaiveMandatoryMpfWisp: "Waive Mandatory MPF/WISP Toggle",
        bossKeyAllowanceTaxableToggle: "'Taxable' Toggle in Allowances",
      };

      const targetComp = companies.find((c) => c.id === companyId);
      toast.success(
        `${fieldLabels[field]} is now ${newValue ? "VISIBLE" : "INVISIBLE"} for ${targetComp?.legalName}`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update setting");
      // Revert optimistic update
      setCompanies((prev) =>
        prev.map((c) => (c.id === companyId ? { ...c, [field]: !newValue } : c))
      );
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 p-6 shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Key className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">Boss Keys Feature Matrix</h1>
                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/30">
                  Superadmin Only
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-300 max-w-3xl">
                Control feature toggle visibility per company. When turned <strong>ON</strong>, the specified toggle button is made available to company users. When turned <strong>OFF</strong>, it remains completely hidden and invisible.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Table Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search company by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Showing <span className="text-slate-200 font-bold">{filteredCompanies.length}</span> of{" "}
          <span className="text-slate-200 font-bold">{companies.length}</span> companies
        </div>
      </div>

      {/* Matrix Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-300 font-semibold uppercase tracking-wider">
                <th className="py-4 px-5">Company Details</th>
                <th className="py-4 px-5 text-center min-w-[220px]">
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Include Other Co. Allowances</span>
                    <span title="Controls visibility of 'Include allowances paid by other companies in statutory contribution computations' toggle in Company Settings">
                      <HelpCircle className="size-3.5 text-slate-400 cursor-help" />
                    </span>
                  </div>
                  <div className="text-[10px] normal-case text-slate-400 font-normal mt-0.5">
                    Company Settings Toggle
                  </div>
                </th>
                <th className="py-4 px-5 text-center min-w-[220px]">
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Waive SSS MPF / WISP</span>
                    <span title="Controls visibility of 'Waive Mandatory SSS MPF / WISP Contribution' toggle in Company Settings">
                      <HelpCircle className="size-3.5 text-slate-400 cursor-help" />
                    </span>
                  </div>
                  <div className="text-[10px] normal-case text-slate-400 font-normal mt-0.5">
                    Company Settings Toggle
                  </div>
                </th>
                <th className="py-4 px-5 text-center min-w-[220px]">
                  <div className="flex items-center justify-center gap-1.5">
                    <span>"Taxable" Toggle in Allowances</span>
                    <span title="Controls visibility of the 'Taxable' toggle switch in Employee Allowance forms">
                      <HelpCircle className="size-3.5 text-slate-400 cursor-help" />
                    </span>
                  </div>
                  <div className="text-[10px] normal-case text-slate-400 font-normal mt-0.5">
                    Employee Allowance Form Toggle
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No companies match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company) => (
                  <tr
                    key={company.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Company Info */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20 font-bold text-xs">
                          <Building2 className="size-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-100 text-sm">
                            {company.legalName}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[11px] text-slate-400">
                              {company.companyCode}
                            </span>
                            <span className="text-[10px] text-slate-500">•</span>
                            <span className="text-[11px] text-slate-400">
                              {company._count.employees} Employees
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Boss Key 1: Include Other Co Allowances */}
                    <td className="py-4 px-5 text-center bg-slate-900/30">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Switch
                          checked={company.bossKeyIncludeOtherCompanyAllowances}
                          onCheckedChange={(checked) =>
                            handleToggle(
                              company.id,
                              "bossKeyIncludeOtherCompanyAllowances",
                              checked
                            )
                          }
                          disabled={
                            loadingId ===
                            `${company.id}-bossKeyIncludeOtherCompanyAllowances`
                          }
                          className="data-[state=checked]:bg-amber-500"
                        />
                        <span
                          className={`text-[11px] font-medium ${
                            company.bossKeyIncludeOtherCompanyAllowances
                              ? "text-amber-400 font-semibold"
                              : "text-slate-500"
                          }`}
                        >
                          {company.bossKeyIncludeOtherCompanyAllowances
                            ? "Visible in Company"
                            : "Invisible"}
                        </span>
                      </div>
                    </td>

                    {/* Boss Key 2: Waive SSS MPF / WISP */}
                    <td className="py-4 px-5 text-center bg-slate-900/30">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Switch
                          checked={company.bossKeyWaiveMandatoryMpfWisp}
                          onCheckedChange={(checked) =>
                            handleToggle(
                              company.id,
                              "bossKeyWaiveMandatoryMpfWisp",
                              checked
                            )
                          }
                          disabled={
                            loadingId ===
                            `${company.id}-bossKeyWaiveMandatoryMpfWisp`
                          }
                          className="data-[state=checked]:bg-amber-500"
                        />
                        <span
                          className={`text-[11px] font-medium ${
                            company.bossKeyWaiveMandatoryMpfWisp
                              ? "text-amber-400 font-semibold"
                              : "text-slate-500"
                          }`}
                        >
                          {company.bossKeyWaiveMandatoryMpfWisp
                            ? "Visible in Company"
                            : "Invisible"}
                        </span>
                      </div>
                    </td>

                    {/* Boss Key 3: "Taxable" Toggle in Allowances */}
                    <td className="py-4 px-5 text-center bg-slate-900/30">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Switch
                          checked={company.bossKeyAllowanceTaxableToggle}
                          onCheckedChange={(checked) =>
                            handleToggle(
                              company.id,
                              "bossKeyAllowanceTaxableToggle",
                              checked
                            )
                          }
                          disabled={
                            loadingId ===
                            `${company.id}-bossKeyAllowanceTaxableToggle`
                          }
                          className="data-[state=checked]:bg-amber-500"
                        />
                        <span
                          className={`text-[11px] font-medium ${
                            company.bossKeyAllowanceTaxableToggle
                              ? "text-amber-400 font-semibold"
                              : "text-slate-500"
                          }`}
                        >
                          {company.bossKeyAllowanceTaxableToggle
                            ? "Visible in Form"
                            : "Invisible"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
