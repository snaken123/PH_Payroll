import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const limiters = new Map<string, Ratelimit>();
const memory = new Map<string, { count: number; resetAt: number }>();

function durationMs(window: Duration): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(window);
  if (!match) throw new Error(`Unsupported rate-limit window: ${window}`);
  const unit = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as "ms" | "s" | "m" | "h" | "d"];
  return Number(match[1]) * unit;
}

function memoryLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || now > entry.resetAt) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

/**
 * Sliding-window rate limit. Returns true when the request is allowed.
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL/TOKEN are set (durable across
 * serverless instances). Without them it falls back to a per-instance in-memory
 * window so the app keeps working before Redis is provisioned. If Redis is
 * configured but errors, it fails CLOSED — an outage must not disable limits.
 */
export async function rateLimit(name: string, key: string, limit: number, window: Duration): Promise<boolean> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return memoryLimit(`${name}:${key}`, limit, durationMs(window));
  }
  let limiter = limiters.get(name);
  if (!limiter) {
    limiter = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(limit, window), prefix: `rl:${name}` });
    limiters.set(name, limiter);
  }
  try {
    const { success } = await limiter.limit(key);
    return success;
  } catch (e) {
    console.error(`[rate-limit] ${name} limiter unavailable, failing closed:`, e instanceof Error ? e.message : String(e));
    return false;
  }
}

/** Client IP from Vercel/Next request headers. */
export function getClientIp(req: { headers: Headers }): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
