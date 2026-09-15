import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const pathname = req.nextUrl.pathname;

  if (token?.isAttendanceStaff) {
    // 1. Restrict Attendance Staff accounts strictly to /dashboard/attendance
    if (pathname.startsWith("/dashboard") && pathname !== "/dashboard/attendance") {
      return NextResponse.redirect(new URL("/dashboard/attendance", req.url));
    }

    // 2. Restrict Attendance Staff from invoking sensitive payroll, salary, and admin APIs
    if (pathname.startsWith("/api/")) {
      const isAllowedApi =
        pathname.startsWith("/api/timesheets") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/companies/options") ||
        pathname.startsWith("/api/companies/mine");

      if (!isAllowedApi) {
        return NextResponse.json(
          { error: "Forbidden: Attendance Staff accounts are restricted to attendance management only." },
          { status: 403 }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
