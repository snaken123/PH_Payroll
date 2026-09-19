import { prisma } from "@/lib/db";
import { getTenantContext, withCompanyScope } from "@/lib/db/scoped";
import { BulkEditEmployeesTable } from "@/components/employees/bulk-edit-employees-table";
import type { BulkEmployeeRow } from "@/lib/validations/employee";

export default async function BulkEditEmployeesPage() {
  const ctx = await getTenantContext();
  const canViewCompensation = ctx.isSuperAdmin || ctx.permissions.includes("employee.view_compensation");

  const employees = await prisma.employee.findMany({
    where: withCompanyScope(ctx.companyId, { isDeleted: false }),
    include: {
      company: { select: { legalName: true, companyCode: true } },
      compensationRecords: { where: { effectiveTo: null }, take: 1 },
    },
    orderBy: { employeeNumber: "asc" },
  });

  const rows: BulkEmployeeRow[] = employees.map((e) => ({
    employeeId: e.id,
    companyName: e.company.legalName || e.company.companyCode,
    employeeNumber: e.employeeNumber,
    firstName: e.firstName,
    lastName: e.lastName,
    middleName: e.middleName ?? "",
    birthDate: e.birthDate.toISOString().slice(0, 10),
    dateHired: e.dateHired ? e.dateHired.toISOString().slice(0, 10) : "",
    sex: e.sex,
    civilStatus: e.civilStatus,
    positionTitle: e.positionTitle,
    departmentName: e.departmentName ?? "",
    rank: e.rank ?? "",
    scheduleType: e.scheduleType ?? "",
    tin: e.tin ?? "",
    sssNumber: e.sssNumber ?? "",
    philhealthNumber: e.philhealthNumber ?? "",
    pagibigNumber: e.pagibigNumber ?? "",
    personalEmail: e.personalEmail ?? "",
    mobileNumber: e.mobileNumber ?? "",
    currentAddress: e.currentAddress ?? "",
    permanentAddress: e.permanentAddress ?? "",
    emergencyContactName: e.emergencyContactName ?? "",
    emergencyContactRelationship: e.emergencyContactRelationship ?? "",
    emergencyContactNumber: e.emergencyContactNumber ?? "",
    emergencyContactAddress: e.emergencyContactAddress ?? "",
    paymentMethod: e.paymentMethod,
    bankName: e.bankName ?? "",
    bankAccountNumber: e.bankAccountNumber ?? "",
    bankBranch: e.bankBranch ?? "",
    isManagerialExempt: e.isManagerialExempt,
    isDeductSss: e.isDeductSss,
    isDeductPhilhealth: e.isDeductPhilhealth,
    isDeductPagibig: e.isDeductPagibig,
    isDeductWithholdingTax: e.isDeductWithholdingTax,
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
      <BulkEditEmployeesTable initialRows={rows} canViewCompensation={canViewCompensation} />
    </div>
  );
}
