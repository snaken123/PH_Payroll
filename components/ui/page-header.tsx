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
    <div className={cn("flex flex-col gap-4 pb-2 md:flex-row md:items-center md:justify-between", className)}>
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
            {description}
          </p>
        )}
        {children}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 sm:self-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
