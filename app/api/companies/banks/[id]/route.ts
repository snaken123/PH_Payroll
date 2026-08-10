import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertCompanyId, requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { updateCompanyBankAccountSchema } from "@/lib/validations/companyBank";

const EDIT_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await requireTenantRole(EDIT_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await prisma.companyBankAccount.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Bank account not found" }, { status: 404 });

  try {
    assertCompanyId(ctx, existing.companyId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateCompanyBankAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.companyBankAccount.updateMany({
          where: { companyId: ctx.companyId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.companyBankAccount.update({
        where: { id },
        data: {
          bankName: data.bankName,
          nickname: data.nickname !== undefined ? data.nickname : existing.nickname,
          accountNumber: data.accountNumber,
          accountName: data.accountName,
          branchName: data.branchName !== undefined ? data.branchName : existing.branchName,
          swiftCode: data.swiftCode !== undefined ? data.swiftCode : existing.swiftCode,
          isDefault: data.isDefault !== undefined ? data.isDefault : existing.isDefault,
        },
      });
    });

    return NextResponse.json({ bankAccount: updated });
  } catch (error) {
    console.error("Failed to update bank account:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await requireTenantRole(EDIT_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await prisma.companyBankAccount.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Bank account not found" }, { status: 404 });

  try {
    assertCompanyId(ctx, existing.companyId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.companyBankAccount.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete bank account:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
