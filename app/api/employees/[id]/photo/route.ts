import { NextResponse } from "next/server";
import { inspectDataUrl } from "@/lib/data-url";
import { prisma } from "@/lib/db";
import { assertCompanyId, requireTenantRole } from "@/lib/db/scoped";
import { CompanyRole } from "@/lib/generated/prisma/enums";

const MANAGE_ROLES = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    assertCompanyId(ctx, existing.companyId);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const photoUrl = typeof body?.photoUrl === "string" ? body.photoUrl : null;
  if (!photoUrl || !inspectDataUrl(photoUrl, ["image/jpeg", "image/png", "image/webp"], 5 * 1024 * 1024)) {
    return NextResponse.json({ error: "Photo must be a JPG, PNG, or WEBP image of 5 MB or less." }, { status: 415 });
  }

  const employee = await prisma.employee.update({
    where: { id },
    data: { photoUrl },
  });

  return NextResponse.json({ employee });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    assertCompanyId(ctx, existing.companyId);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const employee = await prisma.employee.update({
    where: { id },
    data: { photoUrl: null },
  });

  return NextResponse.json({ employee });
}
