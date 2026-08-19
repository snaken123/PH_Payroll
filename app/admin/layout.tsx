import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { CompanySwitcher } from "@/components/company-switcher";
import { ShieldAlertIcon, Building2Icon, UsersIcon, BookOpenIcon, ArrowRightIcon } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if (session.user.platformRole !== "SUPER_ADMIN") redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 dark">
      {/* Top Super Admin Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2.5 font-bold tracking-tight">
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shadow-xs">
                <ShieldAlertIcon className="size-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold leading-tight">Platform Admin Console</span>
                <span className="text-[10px] text-blue-400 font-mono font-medium">SUPER_ADMIN PERMISSIONS</span>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-1.5 text-xs font-medium bg-slate-800/60 p-1 rounded-lg border border-slate-800">
              <Link href="/admin" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-slate-200 hover:bg-slate-700/80 transition-colors">
                <Building2Icon className="size-3.5 text-blue-400" /> Companies
              </Link>
              <Link href="/admin/employees" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-slate-300 hover:bg-slate-700/80 hover:text-white transition-colors">
                <UsersIcon className="size-3.5 text-blue-400" /> All Employees
              </Link>
              <Link href="/admin/rates" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-slate-300 hover:bg-slate-700/80 hover:text-white transition-colors">
                <BookOpenIcon className="size-3.5 text-blue-400" /> Statutory Rate Tables
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/90 text-white text-xs font-semibold hover:bg-blue-600 transition-colors shadow-xs"
            >
              Tenant Dashboard <ArrowRightIcon className="size-3.5" />
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <CompanySwitcher />
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Admin Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8 bg-slate-950 text-slate-100">
        {children}
      </main>
    </div>
  );
}
