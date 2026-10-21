"use client";

import { useEffect } from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

function ThemeInitializer() {
  const { setTheme } = useTheme();
  useEffect(() => {
    // Migrate existing sessions where dark theme was cached in localStorage to light mode default
    try {
      localStorage.removeItem("theme");
      if (!localStorage.getItem("ph_payroll_theme_default_light_v2")) {
        localStorage.setItem("ph_payroll_theme_default_light_v2", "applied");
        setTheme("light");
      }
    } catch {
      // Ignore if localStorage unavailable
    }
  }, [setTheme]);
  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="ph_payroll_theme_v2"
      disableTransitionOnChange
    >
      <ThemeInitializer />
      {children}
    </NextThemesProvider>
  );
}
