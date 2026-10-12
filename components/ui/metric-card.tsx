import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  trend,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/95 dark:hover:border-slate-700",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
          {title}
        </span>
        {Icon && (
          <div className="flex size-7 items-center justify-center rounded-md bg-slate-100/80 text-slate-500 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-800/80 dark:group-hover:text-blue-400">
            <Icon className="size-3.5" />
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline justify-between gap-2">
        <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 tabular-nums">
          {value}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {(subtitle || trend) && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          {trend && (
            <span
              className={cn(
                "font-semibold tabular-nums",
                trend.positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              )}
            >
              {trend.value}
            </span>
          )}
          {subtitle && <span className="truncate">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
