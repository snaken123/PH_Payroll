import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    const isSuperAdmin = token?.platformRole === "SUPER_ADMIN";

    // Platform admin routes (statutory rate config, tenant onboarding).
    if (pathname.startsWith("/admin") && !isSuperAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Company dashboard requires either an active company membership or
    // platform super-admin access.
    if (pathname.startsWith("/dashboard") && !token?.companyId && !isSuperAdmin) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

// This gates page-level navigation only. Every API route and server action
// must independently re-check auth/company scoping (see lib/db/scoped.ts) —
// proxy coverage is not a substitute for per-route checks.
export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/onboarding/:path*"],
};
