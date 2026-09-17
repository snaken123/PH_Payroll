/**
 * Simple sliding window in-memory rate-limiter for sensitive endpoints
 * (e.g. login attempts) to prevent brute-force attacks.
 */
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const attemptsMap = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
): { allowed: boolean; remainingMs: number } {
  const now = Date.now();
  const record = attemptsMap.get(key);

  if (!record || now > record.resetAt) {
    attemptsMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remainingMs: windowMs };
  }

  if (record.count >= maxAttempts) {
    return { allowed: false, remainingMs: record.resetAt - now };
  }

  record.count += 1;
  return { allowed: true, remainingMs: record.resetAt - now };
}

export function resetRateLimit(key: string): void {
  attemptsMap.delete(key);
}
