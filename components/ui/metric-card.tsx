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
        "group relative flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-slate-700",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-800/80 dark:group-hover:text-blue-400">
            <Icon className="size-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {value}
        </div>
        {badge && <div>{badge}</div>}
      </div>

      {(subtitle || trend) && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          {trend && (
            <span
              className={cn(
                "font-semibold",
                trend.positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              )}
            >
              {trend.value}
            </span>
          )}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
