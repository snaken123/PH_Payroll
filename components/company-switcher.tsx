"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Building2Icon } from "lucide-react";

interface CompanyOption {
  id: string;
  legalName: string;
}

interface CompanySwitcherProps {
  initialCompanyId?: string | null;
  initialCompanyName?: string | null;
}

export function CompanySwitcher({ initialCompanyId, initialCompanyName }: CompanySwitcherProps = {}) {
  const { data: session, update } = useSession();
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    fetch("/api/companies/mine")
      .then((res) => (res.ok ? res.json() : { companies: [] }))
      .then((data) => setCompanies(data.companies ?? []))
      .catch(() => setCompanies([]));
  }, []);

  const currentCompanyId = session?.user.companyId ?? initialCompanyId;
  const activeCompany = companies.find((c) => c.id === currentCompanyId);
  const displayName = activeCompany?.legalName ?? initialCompanyName ?? "Select company";

  // If only 1 company or no extra companies available, show styled company badge
  if (companies.length <= 1) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground">
        <Building2Icon className="size-3.5 text-primary" />
        <span className="truncate max-w-[160px]">
          {displayName}
        </span>
      </div>
    );
  }

  async function switchCompany(companyId: string | null) {
    if (!companyId || companyId === currentCompanyId) return;
    setSwitching(true);
    try {
      await update({ companyId });
      window.location.reload();
    } catch {
      setSwitching(false);
    }
  }

  return (
    <Select
      value={currentCompanyId ?? undefined}
      onValueChange={switchCompany}
      disabled={switching}
    >
      <SelectTrigger className="w-56 text-xs font-medium" aria-label="Switch company">
        <div className="flex items-center gap-1.5 min-w-0">
          <Building2Icon className="size-3.5 text-primary shrink-0" />
          <span className="truncate">
            {displayName}
          </span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {companies.map((c) => (
          <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
            {c.legalName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
