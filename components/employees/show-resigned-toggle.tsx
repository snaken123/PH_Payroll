"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function ShowResignedToggle({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onCheckedChange(checked: boolean) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (checked) {
      params.set("showResigned", "true");
    } else {
      params.delete("showResigned");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div
      className={`inline-flex items-center gap-2 select-none px-2.5 py-1 rounded-md border text-xs transition-colors ${
        defaultChecked
          ? "border-blue-300 bg-blue-50/70 text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200 shadow-2xs font-semibold"
          : "border-slate-200/90 bg-white/90 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 shadow-2xs"
      }`}
    >
      <Switch
        id="show-resigned-toggle"
        checked={defaultChecked}
        onCheckedChange={onCheckedChange}
        size="sm"
      />
      <Label
        htmlFor="show-resigned-toggle"
        className="text-xs font-medium cursor-pointer"
      >
        Include Resigned {defaultChecked ? "(Showing)" : ""}
      </Label>
    </div>
  );
}
