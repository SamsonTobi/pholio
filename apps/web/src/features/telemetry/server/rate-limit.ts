export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

export interface RateLimiterOptions {
  limit?: number;
  windowMs?: number;
  maxKeys?: number;
}

/**
 * NOTE: single-instance in-memory limiter. On multi-instance deployments
 * (Vercel/Cloudflare) each instance tracks its own counters, so a distributed
 * attacker can multiply the effective limit by instance count. For strict
 * global limits use a shared store (Redis/Upstash) keyed the same way.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  private limit: number;
  private windowMs: number;
  private maxKeys: number;
  private lastCleanup: number;

  constructor(options: RateLimiterOptions = {}) {
    this.limit = options.limit ?? 60;
    this.windowMs = options.windowMs ?? 60_000;
    this.maxKeys = options.maxKeys ?? 10_000;
    this.lastCleanup = Date.now();
  }

  check(key: string, now: number = Date.now()): RateLimitResult {
    // Opportunistic cleanup every minute or if map grows large
    if (now - this.lastCleanup > 60_000 || this.hits.size > this.maxKeys) {
      this.cleanup(now);
    }

    const timestamps = this.hits.get(key) || [];
    const validTimestamps = timestamps.filter((t) => now - t < this.windowMs);

    if (validTimestamps.length >= this.limit) {
      const oldest = validTimestamps[0];
      const retryAfter = Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000));
      this.hits.set(key, validTimestamps);
      return { allowed: false, retryAfter };
    }

    validTimestamps.push(now);
    this.hits.set(key, validTimestamps);
    return { allowed: true };
  }

  cleanup(now: number = Date.now()): void {
    for (const [key, timestamps] of this.hits.entries()) {
      const valid = timestamps.filter((t) => now - t < this.windowMs);
      if (valid.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, valid);
      }
    }

    // If still oversized, evict oldest entries to prevent memory leaks
    if (this.hits.size > this.maxKeys) {
      const keysToDelete = this.hits.size - this.maxKeys;
      let count = 0;
      for (const key of this.hits.keys()) {
        this.hits.delete(key);
        count++;
        if (count >= keysToDelete) break;
      }
    }

    this.lastCleanup = now;
  }

  reset(): void {
    this.hits.clear();
    this.lastCleanup = Date.now();
  }
}

export const rateLimiter = new RateLimiter();

// Stricter per-session throttle to cap a single tracker session even when
// many sessions share one egress IP (NAT / mobile carriers).
export const sessionRateLimiter = new RateLimiter({
  limit: 30,
  windowMs: 60_000,
  maxKeys: 20_000,
});

export function checkRateLimit(ip: string, now?: number): RateLimitResult {
  return rateLimiter.check(ip, now);
}

export function checkSessionRateLimit(sessionHash: string, now?: number): RateLimitResult {
  return sessionRateLimiter.check(`sess:${sessionHash}`, now);
}

export function resetRateLimit(): void {
  rateLimiter.reset();
  sessionRateLimiter.reset();
}

/**
 * Resolve the real client IP. Prefers the platform-provided IP
 * (`request.ip` on Vercel / `cf-connecting-ip` on Cloudflare) then falls
 * back through standard proxy headers to the first forwarded entry.
 */
export function getClientIp(request: {
  ip?: string;
  headers: { get(name: string): string | null };
}): string {
  const direct = request.ip?.trim();
  if (direct) return direct;
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf.split(",")[0]!.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "127.0.0.1";
}
