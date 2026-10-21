"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
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
      <label
        className={cn(
          "inline-flex items-center justify-center size-5 min-w-[20px] min-h-[20px] max-w-[20px] max-h-[20px] shrink-0 aspect-square select-none cursor-pointer",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          id={id}
          checked={checked}
          disabled={disabled}
          aria-label={ariaLabel}
          onChange={(e) => {
            if (!disabled && onCheckedChange) {
              onCheckedChange(e.target.checked);
            }
          }}
          className="peer sr-only"
          {...props}
        />
        <div
          data-state={checked ? "checked" : "unchecked"}
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
            "flex size-5 min-w-[20px] min-h-[20px] max-w-[20px] max-h-[20px] shrink-0 aspect-square items-center justify-center rounded-md border-2 transition-all",
            checked
              ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
              : "border-slate-400 bg-white hover:border-emerald-600 dark:border-slate-500 dark:bg-slate-900 dark:hover:border-slate-300",
            className
          )}
        >
          {checked ? (
            <CheckIcon className="size-3.5 stroke-[3] text-white pointer-events-none" />
          ) : null}
        </div>
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
