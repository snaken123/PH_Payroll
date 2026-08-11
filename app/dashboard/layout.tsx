import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SignOutButton } from "@/components/sign-out-button";
import { DashboardNav } from "@/components/dashboard-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { CompanySwitcher } from "@/components/company-switcher";
import { Building2Icon, ShieldCheckIcon, UserIcon, MenuIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if (!session.user.companyId) redirect("/onboarding");

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { legalName: true, companyCode: true, tradeName: true },
  });

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop Dark Navy Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 z-40 bg-slate-900 border-r border-slate-800 text-slate-100 shadow-xl">
        {/* Brand & Organization Identity */}
        <div className="p-5 border-b border-slate-800 space-y-3">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-sm group-hover:scale-105 transition-transform">
              <Building2Icon className="size-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold tracking-tight text-white truncate leading-tight group-hover:text-blue-400 transition-colors">
                {company?.legalName ?? "PH Payroll"}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-slate-400 font-mono">
                  ID: {company?.companyCode ?? "tenant"}
                </span>
                <Badge variant="outline" className="text-[9px] px-1 py-0 border-slate-700 text-slate-300 bg-slate-800/80">
                  PROD
                </Badge>
              </div>
            </div>
          </Link>

          {/* Company Switcher */}
          <div className="pt-1">
            <CompanySwitcher />
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          <DashboardNav />
        </div>

        {/* User Identity & System Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 space-y-3">
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-slate-800/50">
            <div className="flex size-8 items-center justify-center rounded-full bg-slate-700 text-slate-200">
              <UserIcon className="size-4" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-slate-200 truncate">
                {session.user.name || session.user.email}
              </span>
              <span className="text-[10px] text-slate-400 truncate">
                {session.user.email}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Mobile Header Bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger className="p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">
                <MenuIcon className="size-5" />
                <span className="sr-only">Toggle Menu</span>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-slate-900 border-slate-800 text-white p-4">
                <SheetHeader className="pb-4 text-left border-b border-slate-800">
                  <SheetTitle className="text-white flex items-center gap-2 text-sm font-bold">
                    <Building2Icon className="size-4 text-blue-500" />
                    {company?.legalName ?? "PH Payroll"}
                  </SheetTitle>
                </SheetHeader>
                <div className="py-4">
                  <DashboardNav />
                </div>
              </SheetContent>
            </Sheet>

            <span className="text-sm font-bold truncate">
              {company?.legalName ?? "PH Payroll"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <CompanySwitcher />
            <ThemeToggle />
          </div>
        </header>

        {/* Top Operational Status Bar */}
        <header className="hidden lg:flex sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 px-6 py-2.5 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheckIcon className="size-4 text-emerald-500" />
            <span className="font-medium text-slate-700 dark:text-slate-300">Statutory Engine Verified</span>
            <span>&bull;</span>
            <span>2026 SSS Circular 2024-006 &amp; PhilHealth Active</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link href="/dashboard/my-pay" className="text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 font-medium">
              Employee Portal
            </Link>
            <span className="text-slate-300 dark:text-slate-700">&bull;</span>
            <Link href="/dashboard/reports" className="text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 font-medium">
              BIR Tax Reports
            </Link>
            <span className="text-slate-300 dark:text-slate-700">&bull;</span>
            <Link href="/dashboard/help" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 font-bold hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 transition-colors">
              Help &amp; Compliance Center
            </Link>
          </div>
        </header>

        {/* Workspace Content View */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200/80 bg-white py-4 text-xs text-slate-500 dark:border-slate-800/80 dark:bg-slate-900">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
            <p>&copy; {new Date().getFullYear()} PH Payroll SaaS. Enterprise Compliance Engine.</p>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-slate-400">Multi-Tenant v2.4</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
