import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if (!session.user.companyId) redirect("/onboarding");

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { legalName: true },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold">
              {company?.legalName ?? "PH Payroll"}
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                Overview
              </Link>
              <Link href="/dashboard/employees" className="text-muted-foreground hover:text-foreground">
                Employees
              </Link>
              <Link href="/dashboard/attendance" className="text-muted-foreground hover:text-foreground">
                Attendance
              </Link>
              <Link href="/dashboard/holidays" className="text-muted-foreground hover:text-foreground">
                Holidays
              </Link>
              <Link href="/dashboard/leave" className="text-muted-foreground hover:text-foreground">
                Leave
              </Link>
              <Link href="/dashboard/payroll" className="text-muted-foreground hover:text-foreground">
                Payroll
              </Link>
              <Link href="/dashboard/reports" className="text-muted-foreground hover:text-foreground">
                Reports
              </Link>
              <Link href="/dashboard/contractors" className="text-muted-foreground hover:text-foreground">
                Contractors
              </Link>
            </nav>
          </div>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
