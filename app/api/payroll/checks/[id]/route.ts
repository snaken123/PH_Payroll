import { NextResponse } from "next/server";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { updatePayrollCheck, deleteOrVoidPayrollCheck } from "@/lib/services/checkService";
import { mutationErrorResponse } from "@/lib/api-error";

const CHECK_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(CHECK_ROLES, { permissionKey: "payroll.post" });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const check = await updatePayrollCheck({
      companyId: ctx.companyId,
      checkId: id,
      ...body,
    });

    return NextResponse.json({ check });
  } catch (err) {
    return mutationErrorResponse(err);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(CHECK_ROLES, { permissionKey: "payroll.post" });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const url = new URL(request.url);
  const action = url.searchParams.get("action") === "DELETE" ? "DELETE" : "VOID";

  try {
    const check = await deleteOrVoidPayrollCheck(ctx.companyId, id, action);
    return NextResponse.json({ success: true, check });
  } catch (err) {
    return mutationErrorResponse(err);
  }
}
