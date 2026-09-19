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

  // Check for duplicates within the submitted table payload itself
  const seenNumbers = new Map<string, string>();
  for (const row of parsed.data.rows) {
    const num = row.employeeNumber?.trim();
    if (!num) continue;
    if (seenNumbers.has(num)) {
      const firstOccurred = seenNumbers.get(num);
      return NextResponse.json(
        {
          error: `Employee number "${num}" is used more than once in your table (${firstOccurred} and ${row.firstName} ${row.lastName}). Each employee must have a unique EMP_ID.`,
        },
        { status: 400 }
      );
    }
    seenNumbers.set(num, `${row.firstName} ${row.lastName}`);
  }

  // Check for collisions with other employees in DB not included in this bulk update batch
  const targetCompanyId = existingEmployees[0]?.companyId;
  if (targetCompanyId) {
    const submittedNumbers = parsed.data.rows.map((r) => r.employeeNumber.trim()).filter(Boolean);
    const existingConflicts = await prisma.employee.findMany({
      where: {
        companyId: targetCompanyId,
        employeeNumber: { in: submittedNumbers },
        id: { notIn: employeeIds },
      },
      select: { employeeNumber: true, firstName: true, lastName: true, isDeleted: true },
    });

    if (existingConflicts.length > 0) {
      const conflict = existingConflicts[0];
      const archiveStatus = conflict.isDeleted ? " (archived/deleted record)" : "";
      return NextResponse.json(
        {
          error: `Employee number "${conflict.employeeNumber}" is already in use by ${conflict.firstName} ${conflict.lastName}${archiveStatus}.`,
        },
        { status: 409 }
      );
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
            dateHired: row.dateHired ? new Date(row.dateHired) : undefined,
            sex: row.sex,
            civilStatus: row.civilStatus,
            positionTitle: row.positionTitle,
            departmentName: row.departmentName || null,
            rank: row.rank || null,
            scheduleType: row.scheduleType || null,
            tin: row.tin || null,
            sssNumber: row.sssNumber || null,
            philhealthNumber: row.philhealthNumber || null,
            pagibigNumber: row.pagibigNumber || null,
            personalEmail: row.personalEmail || null,
            mobileNumber: row.mobileNumber || null,
            currentAddress: row.currentAddress || null,
            permanentAddress: row.permanentAddress || null,
            emergencyContactName: row.emergencyContactName || null,
            emergencyContactRelationship: row.emergencyContactRelationship || null,
            emergencyContactNumber: row.emergencyContactNumber || null,
            emergencyContactAddress: row.emergencyContactAddress || null,
            paymentMethod: row.paymentMethod,
            bankName: row.bankName || null,
            bankAccountNumber: row.bankAccountNumber || null,
            bankBranch: row.bankBranch || null,
            isManagerialExempt: row.isManagerialExempt,
            isDeductSss: row.isDeductSss,
            isDeductPhilhealth: row.isDeductPhilhealth,
            isDeductPagibig: row.isDeductPagibig,
            isDeductWithholdingTax: row.isDeductWithholdingTax,
          },
        });

        const currentComp = existing.compensationRecords[0];
        // 0 is the grid's "no rate yet" placeholder for an employee with no
        // CompensationRecord at all — never create one from a bare 0, that
        // would fabricate a real (wrong) rate the moment someone saves the
        // grid without touching this employee's row.
        const basicRate = row.basicRate ?? 0;
        const payBasis = row.payBasis ?? "MONTHLY_RATE";
        const rateChanged =
          basicRate > 0 &&
          (!currentComp || currentComp.payBasis !== payBasis || currentComp.basicRate.toNumber() !== basicRate);

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
              payBasis,
              basicRate,
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
