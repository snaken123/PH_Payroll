import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { CompanySwitcher } from "@/components/company-switcher";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if (session.user.platformRole !== "SUPER_ADMIN") redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-semibold">
              PH Payroll — Platform Admin
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/admin" className="text-muted-foreground hover:text-foreground">
                Companies
              </Link>
              <Link href="/admin/employees" className="text-muted-foreground hover:text-foreground">
                Employees
              </Link>
              <Link href="/admin/rates" className="text-muted-foreground hover:text-foreground">
                Statutory Rates
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <CompanySwitcher />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
