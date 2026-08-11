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

export const NAV_GROUPS = [
  {
    title: "OPERATIONS",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboardIcon },
      { href: "/dashboard/employees", label: "Employees", icon: UsersIcon },
      { href: "/dashboard/attendance", label: "Attendance", icon: ClockIcon },
      { href: "/dashboard/holidays", label: "Holidays", icon: CalendarDaysIcon },
      { href: "/dashboard/leave", label: "Leave", icon: PalmtreeIcon },
      { href: "/dashboard/loans", label: "Loans", icon: BanknoteIcon },
    ],
  },
  {
    title: "PAYROLL & COMPLIANCE",
    items: [
      { href: "/dashboard/payroll", label: "Payroll Runs", icon: WalletIcon },
      { href: "/dashboard/reports", label: "Statutory Reports", icon: FileTextIcon },
      { href: "/dashboard/contractors", label: "Contractors", icon: BriefcaseIcon },
    ],
  },
  {
    title: "ACCOUNT & PORTAL",
    items: [
      { href: "/dashboard/my-pay", label: "My Pay (Self-Service)", icon: UserCheckIcon },
      { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
      { href: "/dashboard/help", label: "Help & Compliance", icon: BookOpenIcon },
    ],
  },
] as const;

export function DashboardNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.title} className="space-y-1.5">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400/90 dark:text-slate-500">
            {group.title}
          </div>
          <div className="space-y-0.5">
            {group.items.map(({ href, label, icon: Icon }) => {
              const isActive = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-blue-600 text-white shadow-xs font-semibold"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-transform group-hover:scale-105",
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                    )}
                  />
                  <span className="truncate">{label}</span>
                  {isActive && (
                    <span className="ml-auto size-1.5 rounded-full bg-white shadow-xs" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
