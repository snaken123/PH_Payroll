import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

async function authHandler(req: NextRequest, context: any) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";

  if (host) {
    process.env.NEXTAUTH_URL = `${proto}://${host}`;
  }

  return NextAuth(req as any, context, authOptions);
}

export { authHandler as GET, authHandler as POST };
