import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LandmarkIcon,
  ShieldAlertIcon,
  Building2Icon,
  ArrowLeftIcon,
  FileSpreadsheetIcon,
  CheckCircle2Icon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function RemittancesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  if (!session) {
    redirect("/login?callbackUrl=/remittances");
  }

  const isSuperAdmin = session.user.platformRole === "SUPER_ADMIN";
  const isRemittanceOfficer =
    session.user.platformRole === "REMITTANCE_OFFICER" || Boolean(session.user.isRemittanceOfficer);
  const isCompanyAdmin =
    session.user.companyRole &&
    ["COMPANY_OWNER", "PAYROLL_ADMIN"].includes(session.user.companyRole);

  if (!isSuperAdmin && !isRemittanceOfficer && !isCompanyAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-emerald-600 selection:text-white">
      {/* Top Banner & Header Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left Brand Identity */}
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/30">
                <LandmarkIcon className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white sm:text-base">
                    Statutory Remittance Module
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-mono px-1.5 py-0 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60"
                  >
                    Cross-Company
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                  Republic of the Philippines — SSS, PhilHealth, Pag-IBIG &amp; BIR Remittances
                </p>
              </div>
            </div>

            {/* Right Action & User Controls */}
            <div className="flex items-center gap-3">
              {/* Agency Indicators */}
              <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-950/70 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-blue-600 dark:text-blue-400 font-semibold">SSS</span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">PhilHealth</span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">Pag-IBIG</span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">BIR</span>
              </div>

              {/* Super Admin Switcher */}
              {isSuperAdmin && (
                <Link
                  href="/admin"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/30 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <ShieldAlertIcon className="size-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Admin Console</span>
                </Link>
              )}

              {session.user.companyId && (
                <Link
                  href="/dashboard"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-500/30 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Building2Icon className="size-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Company App</span>
                </Link>
              )}

              <ThemeToggle />

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

              {/* User Identity Chip */}
              <div className="flex items-center gap-2 pl-1">
                <div className="flex flex-col text-right hidden sm:block">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                    {session.user.name || session.user.email}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    {session.user.platformRole === "SUPER_ADMIN"
                      ? "Super Admin"
                      : session.user.platformRole === "REMITTANCE_OFFICER" || session.user.isRemittanceOfficer
                      ? "Remittance Officer"
                      : "Payroll Admin"}
                  </span>
                </div>
                <SignOutButton />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>PH Statutory Remittance &amp; Check Disbursement Engine • SEC &amp; BIR Compliant</span>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>SSS Circular 2024-002</span>
            <span>PhilHealth Circular 2024-0013</span>
            <span>Pag-IBIG Circular 460</span>
            <span>BIR 1601-C</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
