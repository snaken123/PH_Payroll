"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CompanyOption {
  id: string;
  legalName: string;
}

export function CompanySwitcher() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    fetch("/api/companies/mine")
      .then((res) => (res.ok ? res.json() : { companies: [] }))
      .then((data) => setCompanies(data.companies ?? []))
      .catch(() => setCompanies([]));
  }, []);

  // Only worth showing to users who actually belong to more than one
  // company — the common case is exactly one, where this would just be
  // a disabled-looking dropdown with nothing to switch to.
  if (companies.length <= 1) return null;

  async function switchCompany(companyId: string | null) {
    if (!companyId) return;
    setSwitching(true);
    await update({ companyId });
    router.push("/dashboard");
    router.refresh();
    setSwitching(false);
  }

  return (
    <Select value={session?.user.companyId ?? undefined} onValueChange={switchCompany} disabled={switching}>
      <SelectTrigger className="w-56" aria-label="Switch company">
        <SelectValue placeholder="Select company" />
      </SelectTrigger>
      <SelectContent>
        {companies.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.legalName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
