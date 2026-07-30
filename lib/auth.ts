import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { env } from "./env";
import { CompanyRole, PlatformRole } from "./generated/prisma/enums";

export const authOptions: NextAuthOptions = {
  secret: env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) return null;

        const passwordMatch = await bcrypt.compare(credentials.password, user.password);
        if (!passwordMatch) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
      }

      // Allow the client to switch active company via useSession().update({ companyId })
      if (trigger === "update" && session?.companyId) {
        token.companyId = session.companyId;
      }

      if (token.id) {
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

        if (!dbUser) {
          // User was deleted after the token was issued — invalidate the session.
          return {};
        }

        token.name = dbUser.name;
        token.platformRole = dbUser.platformRole;

        const requestedCompanyId = (token.companyId as string | undefined) ?? undefined;
        const activeMembership =
          dbUser.memberships.find((m) => m.companyId === requestedCompanyId) ??
          dbUser.memberships[0];

        token.companyId = activeMembership?.companyId ?? null;
        token.companyRole = activeMembership?.role ?? null;
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
