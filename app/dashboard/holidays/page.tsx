import { prisma } from "@/lib/db";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";
import { CreateHolidayDialog } from "@/components/holidays/create-holiday-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function HolidaysPage() {
  const ctx = await getTenantContext();

  const holidays = await prisma.companyHoliday.findMany({
    where: withCompanyScope(ctx.companyId),
    orderBy: { date: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Holidays</h1>
        <CreateHolidayDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Holiday calendar</CardTitle>
        </CardHeader>
        <CardContent>
          {holidays.length === 0 ? (
            <p className="text-sm text-muted-foreground">No holidays configured yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Region</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{h.date.toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell>
                      <Badge variant={h.holidayType === "REGULAR_HOLIDAY" ? "default" : "secondary"}>
                        {h.holidayType.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{h.region ?? "Company-wide"}</TableCell>
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
