import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreateUserDialog } from "@/components/admin/users/create-user-dialog";
import { EditUserDialog } from "@/components/admin/users/edit-user-dialog";
import { DeleteUserDialog } from "@/components/admin/users/delete-user-dialog";
import {
  UsersIcon,
  ShieldAlertIcon,
  UserCheckIcon,
  Building2Icon,
  LockIcon,
  LandmarkIcon,
  UserPlusIcon,
} from "lucide-react";

export default async function AdminUsersPage() {
  const [users, companies] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        platformRole: true,
        isRemittanceOfficer: true,
        createdAt: true,
        memberships: {
          select: {
            id: true,
            companyId: true,
            role: true,
            permissions: true,
            company: { select: { id: true, legalName: true, companyCode: true } },
          },
        },
      },
    }),
    prisma.company.findMany({
      orderBy: { legalName: "asc" },
      select: { id: true, legalName: true, companyCode: true },
    }),
  ]);

  const superAdminCount = users.filter((u) => u.platformRole === "SUPER_ADMIN").length;
  const remittanceCount = users.filter((u) => u.isRemittanceOfficer || u.platformRole === "REMITTANCE_OFFICER").length;
  const standardCount = users.filter((u) => u.platformRole === "STANDARD").length;

  const formattedUsers = users.map((u) => ({
    ...u,
    memberships: u.memberships.map((m) => ({
      ...m,
      permissions: Array.isArray(m.permissions)
        ? (m.permissions as string[])
        : typeof m.permissions === "string"
        ? (JSON.parse(m.permissions) as string[])
        : [],
    })),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Credentials & Access Control"
        description="Super Admin central user directory — manage user credentials, platform roles, company assignments, and granular access trees."
        actions={
          <div className="flex items-center gap-2">
            <CreateUserDialog companies={companies} />
          </div>
        }
      />

      {/* Prominent Quick-Action Create User Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 shadow-sm">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <UserPlusIcon className="size-4 text-blue-400" /> Create Platform User Account
          </h3>
          <p className="text-xs text-slate-300">
            Register new standard users, assign company permissions, or authorize remittance officers with a single click.
          </p>
        </div>
        <CreateUserDialog companies={companies} />
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total User Accounts"
          value={users.length}
          subtitle="Registered platform user accounts"
          icon={UsersIcon}
        />
        <MetricCard
          title="Platform Super Admins"
          value={superAdminCount}
          subtitle="Unrestricted access to all companies & settings"
          icon={ShieldAlertIcon}
        />
        <MetricCard
          title="Remittance Officers"
          value={remittanceCount}
          subtitle="Consolidated statutory payables & checks"
          icon={LandmarkIcon}
        />
        <MetricCard
          title="Standard Users"
          value={standardCount}
          subtitle="Restricted to assigned companies & permissions"
          icon={UserCheckIcon}
        />
      </div>

      {/* User Directory Card Table */}
      <Card className="border-slate-800 bg-slate-900 shadow-xs">
        <CardHeader className="p-4 border-b border-slate-800 bg-slate-900/80 rounded-t-xl flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <UsersIcon className="size-4 text-blue-400" /> Platform User Directory
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono">{users.length} total users</span>
            <CreateUserDialog companies={companies} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No user accounts found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-900/90 border-slate-800">
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">User Name</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Email / Username</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Platform Role</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Access Tree &amp; Companies</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Created Date</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formattedUsers.map((user) => (
                  <TableRow key={user.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="font-bold text-xs text-slate-100 py-3">{user.name || "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-300 py-3">{user.email}</TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-1 items-start">
                        {user.platformRole === "SUPER_ADMIN" ? (
                          <Badge variant="outline" className="text-[10px] font-mono uppercase bg-amber-950/60 border-amber-500/50 text-amber-400">
                            SUPER_ADMIN
                          </Badge>
                        ) : user.platformRole === "REMITTANCE_OFFICER" ? (
                          <Badge variant="outline" className="text-[10px] font-mono uppercase bg-emerald-950/60 border-emerald-500/50 text-emerald-400">
                            REMITTANCE_OFFICER
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-mono uppercase bg-blue-950/60 border-blue-500/50 text-blue-400">
                            STANDARD
                          </Badge>
                        )}
                        {user.isRemittanceOfficer && user.platformRole === "STANDARD" && (
                          <Badge variant="outline" className="text-[10px] font-mono uppercase bg-emerald-950/60 border-emerald-500/50 text-emerald-400 flex items-center gap-1">
                            <LandmarkIcon className="size-2.5 text-emerald-400" /> Remittance Officer
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-3">
                      {user.platformRole === "SUPER_ADMIN" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-400/90 font-medium">
                          <LockIcon className="size-3 text-amber-400" />
                          Unrestricted (All Companies &amp; Modules)
                        </span>
                      ) : user.platformRole === "REMITTANCE_OFFICER" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                          <LandmarkIcon className="size-3.5 text-emerald-400" />
                          Statutory Remittance Portal (All Companies)
                        </span>
                      ) : user.memberships.length === 0 ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-slate-500 italic">No companies assigned</span>
                          {user.isRemittanceOfficer && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                              <LandmarkIcon className="size-3 text-emerald-400" /> Cross-Company Remittances
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex flex-wrap gap-1.5">
                            {user.memberships.map((m) => (
                              <span
                                key={m.id}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-[11px] text-slate-200"
                              >
                                <Building2Icon className="size-3 text-blue-400" />
                                <span className="font-semibold">{m.company.legalName}</span>
                                <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-slate-700 text-slate-300">
                                  {m.permissions.length} perms
                                </Badge>
                              </span>
                            ))}
                          </div>
                          {user.isRemittanceOfficer && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                              <LandmarkIcon className="size-3 text-emerald-400" /> + Cross-Company Remittances Portal
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400 align-top py-3">
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right align-top py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <EditUserDialog user={user} companies={companies} />
                        <DeleteUserDialog user={user} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
