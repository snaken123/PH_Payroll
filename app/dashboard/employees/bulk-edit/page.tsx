import { prisma } from "@/lib/db";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";
import { BulkEditEmployeesTable } from "@/components/employees/bulk-edit-employees-table";
import type { BulkEmployeeRow } from "@/lib/validations/employee";

export default async function BulkEditEmployeesPage() {
  const ctx = await getTenantContext();

  const employees = await prisma.employee.findMany({
    where: withCompanyScope(ctx.companyId),
    include: {
      compensationRecords: { where: { effectiveTo: null }, take: 1 },
    },
    orderBy: { employeeNumber: "asc" },
  });

  const rows: BulkEmployeeRow[] = employees.map((e) => ({
    employeeId: e.id,
    employeeNumber: e.employeeNumber,
    firstName: e.firstName,
    lastName: e.lastName,
    middleName: e.middleName ?? "",
    birthDate: e.birthDate.toISOString().slice(0, 10),
    sex: e.sex,
    civilStatus: e.civilStatus,
    positionTitle: e.positionTitle,
    departmentName: e.departmentName ?? "",
    employmentStatus: e.employmentStatus,
    employeeType: e.employeeType,
    tin: e.tin ?? "",
    sssNumber: e.sssNumber ?? "",
    philhealthNumber: e.philhealthNumber ?? "",
    pagibigNumber: e.pagibigNumber ?? "",
    payBasis: e.compensationRecords[0]?.payBasis ?? "MONTHLY_RATE",
    basicRate: e.compensationRecords[0] ? Number(e.compensationRecords[0].basicRate) : 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bulk edit employees</h1>
        <p className="text-sm text-muted-foreground">
          Edit multiple employees at once, spreadsheet-style. Use the copy icon in a column header to apply
          its first row&apos;s value to every row below. Changing pay basis or basic rate creates a new
          effective-dated compensation record, same as &quot;New rate&quot; on an employee&apos;s profile —
          it never overwrites past pay history in place.
        </p>
      </div>
      <BulkEditEmployeesTable initialRows={rows} />
    </div>
  );
}
