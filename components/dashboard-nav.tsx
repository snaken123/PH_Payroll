"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
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
  ShieldAlertIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";

export interface NavItemDef {
  href: string;
  label: string;
  icon: React.ElementType;
  permission?: string;
}

export interface NavGroupDef {
  title: string;
  items: NavItemDef[];
}

export const NAV_GROUPS: NavGroupDef[] = [
  {
    title: "OPERATIONS",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboardIcon, permission: "overview.view" },
      { href: "/dashboard/employees", label: "Employees", icon: UsersIcon, permission: "employee.view_info" },
      { href: "/dashboard/attendance", label: "Attendance", icon: ClockIcon, permission: "attendance.view" },
      { href: "/dashboard/holidays", label: "Holidays", icon: CalendarDaysIcon, permission: "attendance.view" },
      { href: "/dashboard/leave", label: "Leave", icon: PalmtreeIcon, permission: "leave.view" },
      { href: "/dashboard/loans", label: "Loans", icon: BanknoteIcon, permission: "loans.view" },
    ],
  },
  {
    title: "PAYROLL & COMPLIANCE",
    items: [
      { href: "/dashboard/payroll", label: "Payroll Runs", icon: WalletIcon, permission: "payroll.compute" },
      { href: "/dashboard/reports", label: "Statutory Reports", icon: FileTextIcon, permission: "reports.view" },
      { href: "/dashboard/contractors", label: "Contractors", icon: BriefcaseIcon, permission: "contractors.view" },
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
];

export interface DashboardNavProps {
  onNavigate?: () => void;
}

export function DashboardNav({ onNavigate }: DashboardNavProps) {
  const pathname = usePathname();
  const session = useSession();

  const userPermissions = session?.data?.user?.permissions ?? [];
  const platformRole = session?.data?.user?.platformRole ?? "STANDARD";
  const isSuperAdmin = platformRole === "SUPER_ADMIN";

  const filteredGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (!item.permission) return true;
      return hasPermission(userPermissions, item.permission, platformRole);
    }),
  })).filter((group) => group.items.length > 0);

  const visibleGroups = isSuperAdmin
    ? [
        {
          title: "PLATFORM ADMIN",
          items: [{ href: "/admin", label: "Super Admin Console", icon: ShieldAlertIcon }],
        },
        ...filteredGroups,
      ]
    : filteredGroups;

  return (
    <div className="space-y-6">
      {visibleGroups.map((group) => (
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
