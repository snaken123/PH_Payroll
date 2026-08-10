import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SignOutButton } from "@/components/sign-out-button";
import { DashboardNav } from "@/components/dashboard-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { CompanySwitcher } from "@/components/company-switcher";
import { Building2Icon, SparklesIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if (!session.user.companyId) redirect("/onboarding");

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { legalName: true, companyCode: true },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Top Banner / Announcement Bar */}
      <div className="border-b border-border/40 bg-muted/30 px-4 py-1 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <SparklesIcon className="size-3.5 text-amber-500 animate-pulse" />
        <span>Statutory rate tables updated to official 2026 BIR, SSS Circular 2024-006 &amp; PhilHealth schedules.</span>
      </div>

      {/* Main Glass Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md transition-all">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {/* Logo & Company Identifier */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm group-hover:scale-105 transition-transform">
                <Building2Icon className="size-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight leading-none group-hover:text-primary transition-colors">
                  {company?.legalName ?? "PH Payroll"}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  ID: {company?.companyCode ?? "tenant"}
                </span>
              </div>
            </Link>

            <Badge variant="outline" className="hidden sm:inline-flex text-[10px] uppercase font-semibold tracking-wider text-muted-foreground border-border/60">
              SaaS Engine v2.0
            </Badge>
          </div>

          {/* User Controls & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <CompanySwitcher />
            <div className="h-4 w-px bg-border/60 hidden sm:block" />
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>

        {/* Primary Dashboard Navigation Bar */}
        <div className="border-t border-border/40 bg-muted/10 px-4 sm:px-6">
          <div className="mx-auto max-w-7xl py-1.5">
            <DashboardNav />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
        {children}
      </main>

      {/* Modern SaaS Footer */}
      <footer className="border-t border-border/40 bg-muted/20 py-6 text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6">
          <p>&copy; {new Date().getFullYear()} PH Payroll SaaS. Multi-Tenant Semi-Monthly Compliance Engine.</p>
          <div className="flex items-center gap-4">
            <Link href="/dashboard/my-pay" className="hover:underline">Employee Self-Service</Link>
            <span>&bull;</span>
            <Link href="/dashboard/reports" className="hover:underline">BIR Reports</Link>
            <span>&bull;</span>
            <Link href="/admin/rates" className="hover:underline">Super Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
