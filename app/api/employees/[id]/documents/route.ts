import { NextResponse } from "next/server";
import { inspectDataUrl } from "@/lib/data-url";
import { prisma } from "@/lib/db";
import { assertCompanyId, requireTenantRole, getTenantContext } from "@/lib/db/scoped";
import { CompanyRole, EmployeeDocumentCategory } from "@/lib/generated/prisma/enums";
import { createEmployeeDocumentSchema } from "@/lib/validations/employeeDocument";

const MANAGE_ROLES: CompanyRole[] = [CompanyRole.COMPANY_OWNER, CompanyRole.PAYROLL_ADMIN, CompanyRole.HR_STAFF];

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenantContext();
  const { id } = await context.params;

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee || employee.isDeleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    assertCompanyId(ctx, employee.companyId);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Authorization check: User must either have HR/Admin manage role or be the employee itself
  const isManager = ctx.platformRole === "SUPER_ADMIN" || (ctx.companyRole && MANAGE_ROLES.includes(ctx.companyRole));
  const isSelf = employee.userId === ctx.userId;

  if (!isManager && !isSelf) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const categoryParam = searchParams.get("category");

  const whereCondition: {
    employeeId: string;
    isDeleted: boolean;
    category?: EmployeeDocumentCategory;
  } = {
    employeeId: id,
    isDeleted: false,
  };

  if (categoryParam && Object.values(EmployeeDocumentCategory).includes(categoryParam as EmployeeDocumentCategory)) {
    whereCondition.category = categoryParam as EmployeeDocumentCategory;
  }

  const documents = await prisma.employeeDocument.findMany({
    where: whereCondition,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ documents });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await requireTenantRole(MANAGE_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee || employee.isDeleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    assertCompanyId(ctx, employee.companyId);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createEmployeeDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Verify the actual file bytes: allowed type and ≤ 10 MB. Client-declared size/type are not trusted.
  const file = inspectDataUrl(parsed.data.fileUrl, DOCUMENT_TYPES, MAX_DOCUMENT_BYTES);
  if (!file) {
    return NextResponse.json({ error: "File must be a PDF, image, or Word document of 10 MB or less." }, { status: 415 });
  }

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { name: true, email: true },
  });

  const uploaderName = user?.name || user?.email || "HR Administrator";

  const document = await prisma.employeeDocument.create({
    data: {
      employeeId: id,
      companyId: employee.companyId,
      title: parsed.data.title,
      category: parsed.data.category,
      description: parsed.data.description || null,
      fileUrl: parsed.data.fileUrl,
      fileName: parsed.data.fileName.replace(/[^\w.\- ()]/g, "_").slice(0, 200),
      fileSize: file.bytes,
      mimeType: file.mime,
      uploadedById: ctx.userId,
      uploadedByName: uploaderName,
      documentDate: parsed.data.documentDate ? new Date(parsed.data.documentDate) : null,
    },
  });

  return NextResponse.json({ document }, { status: 201 });
}
