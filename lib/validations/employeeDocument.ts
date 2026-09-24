import { z } from "zod";
import { EmployeeDocumentCategory } from "@/lib/generated/prisma/enums";

export const employeeDocumentCategoryEnum = z.nativeEnum(EmployeeDocumentCategory);

export const createEmployeeDocumentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters")
    .max(120, "Title cannot exceed 120 characters"),
  category: employeeDocumentCategoryEnum.default(EmployeeDocumentCategory.OTHER),
  description: z.string().trim().max(500, "Description cannot exceed 500 characters").optional().nullable(),
  fileUrl: z.string().min(1, "File content is required").max(14_500_000, "File exceeds 10MB limit"),
  fileName: z.string().min(1, "File name is required").max(255),
  fileSize: z.number().int().positive("Invalid file size"),
  mimeType: z.string().min(1, "MIME type is required").default("application/pdf"),
  documentDate: z.string().optional().nullable(),
});

export type CreateEmployeeDocumentInput = z.infer<typeof createEmployeeDocumentSchema>;
