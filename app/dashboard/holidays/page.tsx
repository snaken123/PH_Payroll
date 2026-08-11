import { prisma } from "@/lib/db";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";
import { CreateHolidayDialog } from "@/components/holidays/create-holiday-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { CalendarDaysIcon } from "lucide-react";

export default async function HolidaysPage() {
  const ctx = await getTenantContext();

  const holidays = await prisma.companyHoliday.findMany({
    where: withCompanyScope(ctx.companyId),
    orderBy: { date: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Holiday Calendar"
        description="Configure Philippine regular holidays and special non-working days to compute 200% / 130% holiday premium pay."
        actions={<CreateHolidayDialog />}
      />

      <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarDaysIcon className="size-4 text-blue-600" /> Configured Holiday Days
          </CardTitle>
          <CardDescription className="text-xs">
            {holidays.length} holiday days configured for company payroll runs.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {holidays.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">No company holidays configured yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 dark:bg-slate-900/80">
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Date</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Holiday Name</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Classification</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Applies To Region</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((h) => (
                  <TableRow key={h.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <TableCell className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {h.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                    </TableCell>
                    <TableCell className="font-bold text-xs text-slate-900 dark:text-slate-100">{h.name}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={h.holidayType === "REGULAR_HOLIDAY" ? "ACTIVE" : "INFO"}
                        label={h.holidayType.replaceAll("_", " ")}
                      />
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {h.region ?? "Company-Wide (All Branches)"}
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
