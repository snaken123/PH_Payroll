import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { updateCompanySettingsSchema } from "@/lib/validations/company";

const EDIT_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

export async function GET() {
  let ctx;
  try {
    ctx = await requireTenantRole([
      CompanyRole.COMPANY_OWNER,
      CompanyRole.PAYROLL_ADMIN,
      CompanyRole.HR_STAFF,
    ]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const company = await prisma.company.findUnique({
    where: { id: ctx.companyId },
  });

  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  return NextResponse.json({ company });
}

export async function PATCH(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(EDIT_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateCompanySettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  try {
    let updatedEmployeeCount = 0;
    const updatedCompany = await prisma.$transaction(async (tx) => {
      const comp = await tx.company.update({
        where: { id: ctx.companyId },
        data: {
          legalName: data.legalName,
          tradeName: data.tradeName,
          tin: data.tin,
          rdoCode: data.rdoCode,
          sssEmployerNumber: data.sssEmployerNumber,
          philhealthEmployerNumber: data.philhealthEmployerNumber,
          pagibigEmployerId: data.pagibigEmployerId,
          registeredAddress: data.registeredAddress,
          region: data.region,
          payScheduleStyle: data.payScheduleStyle,
          cutoff1StartDay: data.cutoff1StartDay,
          cutoff1EndDay: data.cutoff1EndDay,
          cutoff2StartDay: data.cutoff2StartDay,
          cutoff2EndDay: data.cutoff2EndDay,
          payDateOffsetDays: data.payDateOffsetDays,
          standardWorkDaysPerMonth: data.standardWorkDaysPerMonth,
          statutoryDeductionTiming: data.statutoryDeductionTiming,
          includeOtherCompanyAllowancesInContributions: data.includeOtherCompanyAllowancesInContributions,
          attendanceStandardTimeIn: data.attendanceStandardTimeIn,
          attendanceStandardTimeOut: data.attendanceStandardTimeOut,
          attendanceLunchBreakMinutes: data.attendanceLunchBreakMinutes,
          attendanceLateGracePeriodMinutes: data.attendanceLateGracePeriodMinutes,
          attendanceOtGracePeriodMinutes: data.attendanceOtGracePeriodMinutes,
          attendanceFlexi1WindowStart: data.attendanceFlexi1WindowStart,
          attendanceFlexi1WindowEnd: data.attendanceFlexi1WindowEnd,
        },
      });

      if (data.applyWorkDaysToEmployees) {
        const res = await tx.compensationRecord.updateMany({
          where: {
            employee: { companyId: ctx.companyId, isDeleted: false },
            effectiveTo: null,
          },
          data: {
            standardWorkDaysPerMonth: data.standardWorkDaysPerMonth,
          },
        });
        updatedEmployeeCount = res.count;
      }

      return comp;
    });

    return NextResponse.json({ company: updatedCompany, updatedEmployeeCount });
  } catch (error) {
    console.error("Failed to update company settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
