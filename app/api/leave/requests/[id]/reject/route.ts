import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";

const APPROVE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(APPROVE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: true },
  });
  if (!leaveRequest) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (leaveRequest.employee.companyId !== ctx.companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (leaveRequest.status !== "PENDING") {
    return NextResponse.json(
      { error: `Cannot reject a request in ${leaveRequest.status} status` },
      { status: 409 }
    );
  }

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: { status: "REJECTED" },
  });

  return NextResponse.json({ leaveRequest: updated });
}
