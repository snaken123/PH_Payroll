import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertCompanyId, requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { Prisma } from "@/lib/generated/prisma/client";
import { bulkUpdateEmployeesSchema } from "@/lib/validations/employee";
import { mutationErrorResponse } from "@/lib/api-error";

const MANAGE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

// Spreadsheet-style bulk edit — applies profile-field and current-pay-rate
// changes to many employees in one request. A rate change never overwrites
// an existing CompensationRecord in place (same invariant as "New rate":
// compensation is effective-dated, past payroll history must not shift
// under it) — it closes the current record and opens a new one, but only
// for rows whose pay actually changed, so re-saving the grid without
// touching a rate column doesn't spawn no-op compensation records.
export async function PATCH(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = bulkUpdateEmployeesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const employeeIds = parsed.data.rows.map((r) => r.employeeId);
  const existingEmployees = await prisma.employee.findMany({
    where: { id: { in: employeeIds } },
    include: { compensationRecords: { where: { effectiveTo: null }, take: 1 } },
  });
  const existingById = new Map(existingEmployees.map((e) => [e.id, e]));

  for (const row of parsed.data.rows) {
    const existing = existingById.get(row.employeeId);
    if (!existing) {
      return NextResponse.json({ error: `Employee ${row.employeeId} not found` }, { status: 404 });
    }
    try {
      assertCompanyId(ctx, existing.companyId);
    } catch {
      return NextResponse.json({ error: `Employee ${row.employeeId} not found` }, { status: 404 });
    }
  }

  const effectiveFrom = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      for (const row of parsed.data.rows) {
        const existing = existingById.get(row.employeeId)!;

        await tx.employee.update({
          where: { id: row.employeeId },
          data: {
            employeeNumber: row.employeeNumber,
            firstName: row.firstName,
            lastName: row.lastName,
            middleName: row.middleName || null,
            birthDate: new Date(row.birthDate),
            sex: row.sex,
            civilStatus: row.civilStatus,
            positionTitle: row.positionTitle,
            departmentName: row.departmentName || null,
            employmentStatus: row.employmentStatus,
            employeeType: row.employeeType,
            tin: row.tin || null,
            sssNumber: row.sssNumber || null,
            philhealthNumber: row.philhealthNumber || null,
            pagibigNumber: row.pagibigNumber || null,
          },
        });

        const currentComp = existing.compensationRecords[0];
        const rateChanged =
          !currentComp ||
          currentComp.payBasis !== row.payBasis ||
          currentComp.basicRate.toNumber() !== row.basicRate;

        if (rateChanged) {
          if (currentComp) {
            await tx.compensationRecord.update({
              where: { id: currentComp.id },
              data: { effectiveTo: effectiveFrom },
            });
          }
          await tx.compensationRecord.create({
            data: {
              employeeId: row.employeeId,
              effectiveFrom,
              payBasis: row.payBasis,
              basicRate: row.basicRate,
              createdByUserId: ctx.userId,
            },
          });
        }
      }
    });

    return NextResponse.json({ success: true, updated: parsed.data.rows.length });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "One of the employee numbers is already in use" }, { status: 409 });
    }
    return mutationErrorResponse(err);
  }
}
