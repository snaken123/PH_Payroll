import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";
import { createCompanyBankAccountSchema } from "@/lib/validations/companyBank";

const VIEW_ROLES = [
  CompanyRole.COMPANY_OWNER,
  CompanyRole.PAYROLL_ADMIN,
  CompanyRole.HR_STAFF,
];
const EDIT_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN];

export async function GET() {
  let ctx;
  try {
    ctx = await requireTenantRole(VIEW_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bankAccounts = await prisma.companyBankAccount.findMany({
    where: { companyId: ctx.companyId },
    orderBy: [{ isDefault: "desc" }, { bankName: "asc" }],
  });

  return NextResponse.json({ bankAccounts });
}

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireTenantRole(EDIT_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createCompanyBankAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  try {
    const bankAccount = await prisma.$transaction(async (tx) => {
      // If setting this as default, unset other defaults for this company
      if (data.isDefault) {
        await tx.companyBankAccount.updateMany({
          where: { companyId: ctx.companyId, isDefault: true },
          data: { isDefault: false },
        });
      }

      // If this is the company's first bank account, auto-set default to true
      const count = await tx.companyBankAccount.count({ where: { companyId: ctx.companyId } });
      const isDefault = count === 0 ? true : data.isDefault;

      return tx.companyBankAccount.create({
        data: {
          companyId: ctx.companyId,
          bankName: data.bankName,
          nickname: data.nickname || null,
          accountNumber: data.accountNumber,
          accountName: data.accountName,
          branchName: data.branchName || null,
          swiftCode: data.swiftCode || null,
          isDefault,
        },
      });
    });

    return NextResponse.json({ bankAccount }, { status: 201 });
  } catch (error) {
    console.error("Failed to create company bank account:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
