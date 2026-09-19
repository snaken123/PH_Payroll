import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

