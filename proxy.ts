import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET || "ph-payroll-local-development-secret-key-2026";
  const { pathname } = req.nextUrl;

  // Attempt to decode session token with secureCookie: true (HTTPS / Production),
  // falling back to secureCookie: false (HTTP / Local)
  let token = await getToken({ req, secret, secureCookie: true });
  if (!token) {
    token = await getToken({ req, secret, secureCookie: false });
  }

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isSuperAdmin = token.platformRole === "SUPER_ADMIN";

  // Platform admin routes (statutory rate config, tenant onboarding).
  if (pathname.startsWith("/admin") && !isSuperAdmin) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Company dashboard requires either an active company membership or
  // platform super-admin access.
  if (pathname.startsWith("/dashboard") && !token.companyId && !isSuperAdmin) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/onboarding/:path*"],
};
