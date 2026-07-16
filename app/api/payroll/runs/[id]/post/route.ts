import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertCompanyId, requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";

const POST_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

// Posting is the point of no return: once POSTED, this run and its payslips
// are immutable at the application layer (no update/delete path exists for
// a posted run anywhere in this codebase — corrections require a new
// adjustment run referencing this one, not editing it in place).
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(POST_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const run = await prisma.payrollRun.findUnique({ where: { id } });
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    assertCompanyId(ctx, run.companyId);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (run.status !== "APPROVED") {
    return NextResponse.json({ error: `Cannot post a run in ${run.status} status` }, { status: 409 });
  }

  const updated = await prisma.payrollRun.update({
    where: { id },
    data: { status: "POSTED", postedAt: new Date(), postedByUserId: ctx.userId },
  });

  return NextResponse.json({ run: updated });
}
