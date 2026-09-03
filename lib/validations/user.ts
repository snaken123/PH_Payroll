import { z } from "zod";

export const platformRoleValues = ["STANDARD", "SUPER_ADMIN"] as const;
export const companyRoleValues = [
  "COMPANY_OWNER",
  "PAYROLL_ADMIN",
  "HR_STAFF",
  "APPROVER",
  "EMPLOYEE_SELF",
] as const;

export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  platformRole: z.enum(platformRoleValues),
  companyId: z.string().optional(),
  companyRole: z.enum(companyRoleValues).optional(),
});

export type CreateUserFormValues = z.input<typeof createUserSchema>;
export type CreateUserInput = z.output<typeof createUserSchema>;

export const updateUserSchema = z.object({
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  name: z.string().min(1, "Name is required").optional(),
  platformRole: z.enum(platformRoleValues).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
