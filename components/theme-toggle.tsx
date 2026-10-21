"use client";

import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="size-9 rounded-lg border border-slate-200 dark:border-slate-800" />
    );
  }

  const isDark = resolvedTheme === "dark" || theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle light/dark theme"
    >
      {isDark ? (
        <SunIcon className="size-4 text-amber-400 hover:rotate-45 transition-transform" />
      ) : (
        <MoonIcon className="size-4 text-slate-700 hover:-rotate-12 transition-transform" />
      )}
    </button>
  );
}
