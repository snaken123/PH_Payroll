import Link from "next/link";
import { ArrowUpDownIcon, ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort?: string;
  currentOrder?: "asc" | "desc";
  basePath: string;
  query?: Record<string, string | number | undefined | null>;
  align?: "left" | "right" | "center";
  className?: string;
}

export function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentOrder,
  basePath,
  query = {},
  align = "left",
  className,
}: SortableHeaderProps) {
  const isSorted = currentSort === sortKey;
  const nextOrder = isSorted && currentOrder === "asc" ? "desc" : "asc";

  const searchParams = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      searchParams.set(k, String(v));
    }
  });
  searchParams.set("sort", sortKey);
  searchParams.set("order", nextOrder);
  searchParams.delete("page"); // Reset page pagination on sort change

  const href = `${basePath}?${searchParams.toString()}`;

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 group select-none transition-colors",
        align === "right" && "flex-row-reverse justify-start w-full text-right",
        align === "center" && "justify-center w-full text-center",
        isSorted
          ? "text-blue-600 dark:text-blue-400 font-bold"
          : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
        className
      )}
    >
      <span className="uppercase text-xs font-bold tracking-wider">{label}</span>
      <span
        className={cn(
          "p-0.5 rounded transition-colors shrink-0",
          isSorted
            ? "bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400"
            : "text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-slate-700 dark:group-hover:text-slate-200"
        )}
      >
        {isSorted ? (
          currentOrder === "desc" ? (
            <ArrowDownIcon className="size-3.5" />
          ) : (
            <ArrowUpIcon className="size-3.5" />
          )
        ) : (
          <ArrowUpDownIcon className="size-3.5" />
        )}
      </span>
    </Link>
  );
}
