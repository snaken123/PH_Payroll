import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreateUserDialog } from "@/components/admin/users/create-user-dialog";
import { EditUserDialog } from "@/components/admin/users/edit-user-dialog";
import { UsersIcon, ShieldAlertIcon, UserCheckIcon, Building2Icon } from "lucide-react";

export default async function AdminUsersPage() {
  const [users, companies] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        platformRole: true,
        createdAt: true,
        memberships: {
          select: {
            id: true,
            role: true,
            company: { select: { id: true, legalName: true } },
          },
        },
      },
    }),
    prisma.company.findMany({
      orderBy: { legalName: "asc" },
      select: { id: true, legalName: true },
    }),
  ]);

  const superAdminCount = users.filter((u) => u.platformRole === "SUPER_ADMIN").length;
  const standardCount = users.filter((u) => u.platformRole === "STANDARD").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Credentials &amp; Access Control"
        description="Platform user directory — edit login usernames, update passwords, and manage super-admin access privileges."
        actions={<CreateUserDialog companies={companies} />}
      />

      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          title="Total User Accounts"
          value={users.length}
          subtitle="Registered platform accounts"
          icon={UsersIcon}
        />
        <MetricCard
          title="Super Admin Users"
          value={superAdminCount}
          subtitle="Full platform access privileges"
          icon={ShieldAlertIcon}
        />
        <MetricCard
          title="Standard Users"
          value={standardCount}
          subtitle="Tenant level accounts"
          icon={UserCheckIcon}
        />
      </div>

      {/* User Directory Card Table */}
      <Card className="border-slate-800 bg-slate-900 shadow-xs">
        <CardHeader className="p-4 border-b border-slate-800 bg-slate-900/80 rounded-t-xl flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <UsersIcon className="size-4 text-blue-400" /> Platform User Directory
          </CardTitle>
          <span className="text-xs text-slate-400 font-mono">{users.length} total users</span>
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
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Company Memberships</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Created Date</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="font-bold text-xs text-slate-100">{user.name || "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-300">{user.email}</TableCell>
                    <TableCell>
                      {user.platformRole === "SUPER_ADMIN" ? (
                        <Badge variant="outline" className="text-[10px] font-mono uppercase bg-blue-950/60 border-blue-500/50 text-blue-400">
                          SUPER_ADMIN
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-mono uppercase bg-slate-800/60 border-slate-700 text-slate-300">
                          STANDARD
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.memberships.length === 0 ? (
                        <span className="text-xs text-slate-500 italic">No company linked</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {user.memberships.map((m) => (
                            <span
                              key={m.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] text-slate-300 font-medium"
                            >
                              <Building2Icon className="size-3 text-blue-400" />
                              {m.company.legalName} ({m.role})
                            </span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <EditUserDialog user={user} />
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
