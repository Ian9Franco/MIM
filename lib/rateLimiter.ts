/**
 * Lightweight in-memory rate limiter for Edge/Node Next.js endpoints.
 * Tracks requests per IP using a sliding window to block abuse and DoS vectors.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

const store = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now > record.resetTime) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

if (typeof cleanupInterval === "object" && typeof cleanupInterval.unref === "function") {
  cleanupInterval.unref();
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Checks and increments the rate limit count for a given identifier (IP or token).
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { windowMs: 60 * 1000, maxRequests: 20 }
): RateLimitResult {
  const now = Date.now();
  const key = identifier.trim() || "anonymous";
  const record = store.get(key);

  if (!record || now > record.resetTime) {
    store.set(key, {
      count: 1,
      resetTime: now + options.windowMs,
    });
    return {
      success: true,
      limit: options.maxRequests,
      remaining: options.maxRequests - 1,
      resetInSeconds: Math.ceil(options.windowMs / 1000),
    };
  }

  if (record.count >= options.maxRequests) {
    return {
      success: false,
      limit: options.maxRequests,
      remaining: 0,
      resetInSeconds: Math.max(0, Math.ceil((record.resetTime - now) / 1000)),
    };
  }

  record.count += 1;
  return {
    success: true,
    limit: options.maxRequests,
    remaining: Math.max(0, options.maxRequests - record.count),
    resetInSeconds: Math.max(0, Math.ceil((record.resetTime - now) / 1000)),
  };
}

/**
 * Extracts client IP from incoming request headers.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "anonymous";
}
