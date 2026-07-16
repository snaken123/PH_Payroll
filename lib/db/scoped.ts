import { getAuthSession } from "@/lib/auth";
import { CompanyRole, PlatformRole } from "@/lib/generated/prisma/enums";

export interface TenantContext {
  userId: string;
  companyId: string;
  companyRole: CompanyRole | null;
  platformRole: PlatformRole;
}

/**
 * Resolves the authenticated user's active tenant context. Throws if there's
 * no session or no active company. Every tenant-scoped API route/server
 * action must call this first, before touching Prisma — this is the second
 * of three isolation layers (schema, query construction, route); it does not
 * replace per-route role checks.
 */
export async function getTenantContext(): Promise<TenantContext> {
  const session = await getAuthSession();
  if (!session) throw new Error("Unauthorized");
  if (!session.user.companyId) throw new Error("No active company selected");

  return {
    userId: session.user.id,
    companyId: session.user.companyId,
    companyRole: session.user.companyRole,
    platformRole: session.user.platformRole,
  };
}

/** Tenant context + company-role check in one call, for API route handlers. */
export async function requireTenantRole(allowedRoles: CompanyRole[]): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (ctx.platformRole === PlatformRole.SUPER_ADMIN) return ctx;
  if (!ctx.companyRole || !allowedRoles.includes(ctx.companyRole)) {
    throw new Error("Forbidden");
  }
  return ctx;
}

/**
 * Throws unless `resourceCompanyId` matches the caller's active company.
 * Call this before mutating any record that was fetched by id, to guard
 * against IDOR: a user guessing/enumerating an id belonging to another
 * tenant. This check is NOT skipped for super admins — cross-tenant
 * mutation by platform staff should go through an explicit admin flow,
 * not silently fall through here.
 */
export function assertCompanyId(ctx: TenantContext, resourceCompanyId: string) {
  if (ctx.companyId !== resourceCompanyId) {
    throw new Error("Forbidden: resource does not belong to the active company");
  }
}

/**
 * Merges companyId into a Prisma `where` clause. Use this at every
 * tenant-scoped query call site so the tenant filter is always visible in
 * the code, e.g. `prisma.employee.findMany({ where: withCompanyScope(ctx.companyId, { ... }) })`.
 */
export function withCompanyScope<T extends Record<string, unknown>>(
  companyId: string,
  where: T = {} as T
): T & { companyId: string } {
  return { ...where, companyId };
}
