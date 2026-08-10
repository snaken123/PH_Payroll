import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { CompanySwitcher } from "@/components/company-switcher";
import { ShieldAlertIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if (session.user.platformRole !== "SUPER_ADMIN") redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2 font-bold tracking-tight">
              <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500 text-amber-950 font-bold">
                <ShieldAlertIcon className="size-4" />
              </div>
              <span>Platform Super Admin</span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono border-amber-500/40 text-amber-600 dark:text-amber-400">
                SUPER_ADMIN
              </Badge>
            </Link>
            <nav className="flex items-center gap-2 text-xs font-medium">
              <Link href="/admin" className="rounded-md px-2.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                Companies
              </Link>
              <Link href="/admin/employees" className="rounded-md px-2.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                Employees
              </Link>
              <Link href="/admin/rates" className="rounded-md px-2.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                Statutory Rates
              </Link>
              <Link href="/dashboard" className="rounded-md px-2.5 py-1 text-primary hover:bg-primary/10 transition-colors">
                &larr; Switch to Tenant Dashboard
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <CompanySwitcher />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
    </div>
  );
}
