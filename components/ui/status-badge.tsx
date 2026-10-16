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

  let variantStyles = "bg-slate-100/90 text-slate-700 border-slate-200/90 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/80";

  if (["ACTIVE", "REGULAR", "POSTED", "APPROVED", "COMPLETED", "PAID"].includes(normalized)) {
    variantStyles = "bg-emerald-50 text-emerald-800 border-emerald-200/90 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/80";
  } else if (["PROBATIONARY", "PENDING", "PENDING_APPROVAL", "DRAFT", "ON_LEAVE", "UNPAID"].includes(normalized)) {
    variantStyles = "bg-amber-50 text-amber-800 border-amber-200/90 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/80";
  } else if (["INACTIVE", "TERMINATED", "VOID", "REJECTED", "SUSPENDED"].includes(normalized)) {
    variantStyles = "bg-rose-50 text-rose-800 border-rose-200/90 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/80";
  } else if (["CONTRACTOR", "RETAINER", "INFO", "PARTIALLY_PAID"].includes(normalized)) {
    variantStyles = "bg-blue-50 text-blue-800 border-blue-200/90 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/80";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium border tracking-wider uppercase rounded-md transition-colors select-none",
        size === "sm" ? "px-1.5 py-0.5 text-[9.5px] h-5 leading-none" : "px-2 py-0.5 text-[10.5px] h-6 leading-none",
        variantStyles,
        className
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full shrink-0",
          ["ACTIVE", "REGULAR", "POSTED", "APPROVED", "COMPLETED", "PAID"].includes(normalized) && "bg-emerald-600 dark:bg-emerald-400",
          ["PROBATIONARY", "PENDING", "PENDING_APPROVAL", "DRAFT", "ON_LEAVE", "UNPAID"].includes(normalized) && "bg-amber-600 dark:bg-amber-400",
          ["INACTIVE", "TERMINATED", "VOID", "REJECTED", "SUSPENDED"].includes(normalized) && "bg-rose-600 dark:bg-rose-400",
          !["ACTIVE", "REGULAR", "POSTED", "APPROVED", "COMPLETED", "PAID", "PROBATIONARY", "PENDING", "PENDING_APPROVAL", "DRAFT", "ON_LEAVE", "UNPAID", "INACTIVE", "TERMINATED", "VOID", "REJECTED", "SUSPENDED"].includes(normalized) && "bg-blue-600 dark:bg-blue-400"
        )}
      />
      {displayLabel}
    </span>
  );
}
