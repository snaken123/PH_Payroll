"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboardIcon,
  UsersIcon,
  ClockIcon,
  CalendarDaysIcon,
  PalmtreeIcon,
  WalletIcon,
  BanknoteIcon,
  FileTextIcon,
  BriefcaseIcon,
  UserCheckIcon,
  SettingsIcon,
  BookOpenIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboardIcon },
  { href: "/dashboard/employees", label: "Employees", icon: UsersIcon },
  { href: "/dashboard/attendance", label: "Attendance", icon: ClockIcon },
  { href: "/dashboard/holidays", label: "Holidays", icon: CalendarDaysIcon },
  { href: "/dashboard/leave", label: "Leave", icon: PalmtreeIcon },
  { href: "/dashboard/loans", label: "Loans", icon: BanknoteIcon },
  { href: "/dashboard/payroll", label: "Payroll", icon: WalletIcon },
  { href: "/dashboard/reports", label: "Reports", icon: FileTextIcon },
  { href: "/dashboard/contractors", label: "Contractors", icon: BriefcaseIcon },
  { href: "/dashboard/my-pay", label: "My Pay", icon: UserCheckIcon },
  { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
  { href: "/dashboard/help", label: "Help & Compliance", icon: BookOpenIcon },
] as const;

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto text-sm no-scrollbar py-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            <Icon className={cn("size-3.5 transition-transform group-hover:scale-110", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
