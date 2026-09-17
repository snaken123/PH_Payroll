import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { env } from "./env";
import { CompanyRole, PlatformRole } from "./generated/prisma/enums";

import { checkRateLimit, resetRateLimit } from "./rate-limit";

export const authOptions: NextAuthOptions = {
  secret: env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const identifier = credentials.email.trim().toLowerCase();

        // Finding #2 Fix: Rate limit login attempts per identifier (max 10 attempts per 15 mins)
        const rateLimitKey = `auth_login:${identifier}`;
        const limit = checkRateLimit(rateLimitKey, 10, 15 * 60 * 1000);
        if (!limit.allowed) {
          throw new Error("Too many failed login attempts. Please try again later.");
        }

        // 1. Try standard User lookup by email
        const user = await prisma.user.findUnique({
          where: { email: identifier },
        });

        if (user && user.password) {
          const passwordMatch = await bcrypt.compare(credentials.password, user.password);
          if (passwordMatch) {
            resetRateLimit(rateLimitKey);
            return { id: user.id, email: user.email, name: user.name };
          }
        }

        // 2. Try AttendanceAccount lookup by username
        const attendanceAccount = await prisma.attendanceAccount.findFirst({
          where: { username: identifier, isActive: true },
        });

        if (attendanceAccount && attendanceAccount.passwordHash) {
          const passwordMatch = await bcrypt.compare(credentials.password, attendanceAccount.passwordHash);
          if (passwordMatch) {
            resetRateLimit(rateLimitKey);
            return {
              id: attendanceAccount.id,
              email: `${attendanceAccount.username}@attendance.local`,
              name: attendanceAccount.name,
              isAttendanceStaff: true,
              companyId: attendanceAccount.companyId,
            };
          }
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const urlObj = new URL(url);
        const baseUrlObj = new URL(baseUrl);
        if (
          urlObj.origin === baseUrlObj.origin ||
          urlObj.hostname.endsWith("salazar-group.net") ||
          urlObj.hostname.endsWith("vercel.app")
        ) {
          return url;
        }
      } catch {
        // Ignore invalid URLs
      }
      return baseUrl;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        if (user.isAttendanceStaff) {
          token.isAttendanceStaff = true;
          token.companyId = user.companyId ?? null;
          token.companyRole = null;
        }
      }

      if (token.isAttendanceStaff) {
        token.platformRole = PlatformRole.STANDARD;
        if (trigger === "update" && session?.companyId && token.id) {
          try {
            const acc = await prisma.attendanceAccount.findFirst({
              where: {
                id: token.id as string,
                isActive: true,
                OR: [
                  { companyId: session.companyId },
                  { companies: { some: { companyId: session.companyId } } },
                ],
              },
            });
            if (acc) {
              token.companyId = session.companyId;
            } else {
              // Account no longer active or assigned to company — revoke token
              return {};
            }
          } catch (error) {
            console.error("Error switching attendance company:", error);
          }
        }
        return token;
      }

      // Allow the client to switch active company via useSession().update({ companyId })
      if (trigger === "update" && session?.companyId) {
        token.companyId = session.companyId;
      }

      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              name: true,
              platformRole: true,
              memberships: {
                where: { isActive: true },
                select: { companyId: true, role: true },
              },
            },
          });

          // Finding #7 Fix: Revoke JWT session immediately if user account no longer exists
          if (!dbUser) {
            return {};
          }

          token.name = dbUser.name;
          token.platformRole = dbUser.platformRole;

          const requestedCompanyId = (token.companyId as string | undefined) ?? undefined;
          const activeMembership = dbUser.memberships.find((m) => m.companyId === requestedCompanyId);

          if (activeMembership) {
            token.companyId = activeMembership.companyId;
            token.companyRole = activeMembership.role;
          } else if (dbUser.platformRole === PlatformRole.SUPER_ADMIN && requestedCompanyId) {
            const company = await prisma.company.findUnique({ where: { id: requestedCompanyId }, select: { id: true } });
            token.companyId = company?.id ?? dbUser.memberships[0]?.companyId ?? null;
            token.companyRole = null;
          } else {
            const fallback = dbUser.memberships[0];
            token.companyId = fallback?.companyId ?? null;
            token.companyRole = fallback?.role ?? null;
          }
        } catch (error) {
          console.error("NextAuth jwt callback db error:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.platformRole = token.platformRole as PlatformRole;
        session.user.companyId = (token.companyId as string | null) ?? null;
        session.user.companyRole = (token.companyRole as CompanyRole | null) ?? null;
        session.user.isAttendanceStaff = (token.isAttendanceStaff as boolean | undefined) ?? false;
      }
      return session;
    },
  },
};

export const getAuthSession = () => getServerSession(authOptions);

export async function requireCompanyRole(allowedRoles: CompanyRole[]) {
  const session = await getAuthSession();
  if (!session) throw new Error("Unauthorized");
  if (session.user.platformRole === PlatformRole.SUPER_ADMIN) return session;
  if (!session.user.companyRole || !allowedRoles.includes(session.user.companyRole)) {
    throw new Error("Forbidden");
  }
  return session;
}

export async function requireSuperAdmin() {
  const session = await getAuthSession();
  if (!session) throw new Error("Unauthorized");
  if (session.user.platformRole !== PlatformRole.SUPER_ADMIN) {
    throw new Error("Forbidden");
  }
  return session;
}
