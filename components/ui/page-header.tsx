import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3.5 pb-4 border-b border-slate-200/80 dark:border-slate-800/80 md:flex-row md:items-center md:justify-between", className)}>
      <div className="space-y-1 min-w-0">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
        {children}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
