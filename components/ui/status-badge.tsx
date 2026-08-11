import { cn } from "@/lib/utils";

export type StatusType =
  | "ACTIVE"
  | "REGULAR"
  | "POSTED"
  | "APPROVED"
  | "PROBATIONARY"
  | "PENDING"
  | "PENDING_APPROVAL"
  | "DRAFT"
  | "INACTIVE"
  | "TERMINATED"
  | "VOID"
  | "REJECTED"
  | "CONTRACTOR"
  | "ON_LEAVE"
  | string;

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({ status, label, size = "md", className }: StatusBadgeProps) {
  const normalized = (status || "").toUpperCase();
  const displayLabel = label || normalized.replaceAll("_", " ");

  let variantStyles = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700";

  if (["ACTIVE", "REGULAR", "POSTED", "APPROVED", "COMPLETED"].includes(normalized)) {
    variantStyles = "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60";
  } else if (["PROBATIONARY", "PENDING", "PENDING_APPROVAL", "DRAFT", "ON_LEAVE"].includes(normalized)) {
    variantStyles = "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60";
  } else if (["INACTIVE", "TERMINATED", "VOID", "REJECTED", "SUSPENDED"].includes(normalized)) {
    variantStyles = "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60";
  } else if (["CONTRACTOR", "INFO"].includes(normalized)) {
    variantStyles = "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold border tracking-wider uppercase rounded-md transition-colors",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
        variantStyles,
        className
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full shrink-0",
          ["ACTIVE", "REGULAR", "POSTED", "APPROVED"].includes(normalized) && "bg-emerald-500",
          ["PROBATIONARY", "PENDING", "PENDING_APPROVAL", "DRAFT"].includes(normalized) && "bg-amber-500",
          ["INACTIVE", "TERMINATED", "VOID", "REJECTED"].includes(normalized) && "bg-rose-500",
          !["ACTIVE", "REGULAR", "POSTED", "APPROVED", "PROBATIONARY", "PENDING", "PENDING_APPROVAL", "DRAFT", "INACTIVE", "TERMINATED", "VOID", "REJECTED"].includes(normalized) && "bg-blue-500"
        )}
      />
      {displayLabel}
    </span>
  );
}
