"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  (
    {
      checked = false,
      onCheckedChange,
      disabled = false,
      className,
      id,
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        id={id}
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        data-state={checked ? "checked" : "unchecked"}
        data-checked={checked ? "" : undefined}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled && onCheckedChange) {
            onCheckedChange(!checked);
          }
        }}
        style={{
          width: "20px",
          height: "20px",
          minWidth: "20px",
          minHeight: "20px",
          maxWidth: "20px",
          maxHeight: "20px",
          boxSizing: "border-box",
        }}
        className={cn(
          "inline-flex size-5 min-w-[20px] min-h-[20px] max-w-[20px] max-h-[20px] shrink-0 aspect-square items-center justify-center rounded-md border-2 transition-all cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50",
          checked
            ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
            : "border-slate-400 bg-white hover:border-emerald-600 dark:border-slate-500 dark:bg-slate-900 dark:hover:border-slate-300",
          className
        )}
        {...props}
      >
        {checked ? (
          <CheckIcon className="size-3.5 stroke-[3] text-white pointer-events-none" />
        ) : null}
      </button>
    );
  }
);

Checkbox.displayName = "Checkbox";
