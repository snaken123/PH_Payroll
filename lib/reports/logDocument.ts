import { prisma } from "@/lib/db";
import type { DocumentType, DocumentSourceType } from "@/lib/generated/prisma/enums";

export async function logGeneratedDocument(params: {
  companyId: string;
  documentType: DocumentType;
  sourceType: DocumentSourceType;
  generatedByUserId: string;
  sourceRunId?: string;
  sourcePeriodStart?: Date;
  sourcePeriodEnd?: Date;
  employeeId?: string;
}) {
  return prisma.generatedDocument.create({ data: params });
}
