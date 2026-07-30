import { z } from "zod";

// Validated once at process startup so a missing/misconfigured variable fails
// loudly here — as a clear boot-time error — instead of surfacing later as an
// opaque Prisma connection failure or a silent NextAuth misconfiguration.
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Missing or invalid required environment variable(s): ${missing}`);
  }
  return parsed.data;
}

export const env = loadEnv();
