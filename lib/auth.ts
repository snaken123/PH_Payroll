import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { env } from "./env";
import { CompanyRole, PlatformRole } from "./generated/prisma/enums";

import { checkRateLimit, resetRateLimit } from "./rate-limit";

import { parsePermissions, ALL_PERMISSIONS } from "./permissions";

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

        const rateLimitKey = `auth_login:${identifier}`;
        const limit = checkRateLimit(rateLimitKey, 10, 15 * 60 * 1000);
        if (!limit.allowed) {
          throw new Error("Too many failed login attempts. Please try again later.");
        }

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
      }

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
                select: { companyId: true, role: true, permissions: true },
              },
            },
          });

          if (!dbUser) {
            return {};
          }

          token.name = dbUser.name;
          token.platformRole = dbUser.platformRole;

          const requestedCompanyId = (token.companyId as string | undefined) ?? undefined;
          const activeMembership = dbUser.memberships.find((m) => m.companyId === requestedCompanyId) ?? dbUser.memberships[0];

          if (dbUser.platformRole === PlatformRole.SUPER_ADMIN) {
            token.companyId = requestedCompanyId ?? dbUser.memberships[0]?.companyId ?? null;
            token.companyRole = activeMembership?.role ?? null;
            token.permissions = ALL_PERMISSIONS;
          } else if (activeMembership) {
            token.companyId = activeMembership.companyId;
            token.companyRole = activeMembership.role;
            token.permissions = parsePermissions(activeMembership.permissions);
          } else {
            token.companyId = null;
            token.companyRole = null;
            token.permissions = [];
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
        session.user.permissions = (token.permissions as string[] | undefined) ?? [];
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
