// ============================================
// CCM — Tiered Rate Limiter (Upstash Redis)
// Sliding window rate limiting with in-memory fallback
// ============================================

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { CCMTier } from "./feature-gating";

export interface CCMRateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
  retryAfterMs?: number;
}

// ---- Tier-based rate limits ----

type CCMEndpoint = "analysis" | "sync" | "report" | "remediation";

interface CCMEndpointLimits {
  limit: number;
  windowMs: number;
}

const CCM_RATE_LIMITS: Record<CCMTier, Record<CCMEndpoint, CCMEndpointLimits>> = {
  none: {
    analysis: { limit: 0, windowMs: 60000 },
    sync: { limit: 0, windowMs: 3600000 },
    report: { limit: 0, windowMs: 3600000 },
    remediation: { limit: 0, windowMs: 3600000 },
  },
  starter: {
    analysis: { limit: 5, windowMs: 60000 },         // 5/min
    sync: { limit: 2, windowMs: 3600000 },            // 2/hour
    report: { limit: 3, windowMs: 3600000 },           // 3/hour
    remediation: { limit: 5, windowMs: 3600000 },      // 5/hour
  },
  professional: {
    analysis: { limit: 20, windowMs: 60000 },         // 20/min
    sync: { limit: 10, windowMs: 3600000 },            // 10/hour
    report: { limit: 10, windowMs: 3600000 },           // 10/hour
    remediation: { limit: 20, windowMs: 3600000 },      // 20/hour
  },
  enterprise: {
    analysis: { limit: 60, windowMs: 60000 },         // 60/min
    sync: { limit: 30, windowMs: 3600000 },            // 30/hour
    report: { limit: 30, windowMs: 3600000 },           // 30/hour
    remediation: { limit: 60, windowMs: 3600000 },      // 60/hour
  },
};

// ---- Redis Client (lazy-init) ----

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }
  _redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return _redis;
}

// ---- Rate Limiter Cache ----

const limiters = new Map<string, Ratelimit>();

function getLimiter(windowMs: number, limit: number): Ratelimit {
  const key = `${windowMs}:${limit}`;
  let limiter = limiters.get(key);
  if (limiter) return limiter;

  const redis = getRedis();
  if (!redis) {
    throw new Error("Redis not configured");
  }

  const windowSeconds = Math.ceil(windowMs / 1000);
  const windowStr = `${windowSeconds} s` as `${number} s`;

  limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, windowStr),
    prefix: "ccm:rl",
    analytics: false,
  });

  limiters.set(key, limiter);
  return limiter;
}

// ---- In-memory fallback ----

const fallbackBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimitInMemory(
  identifier: string,
  limit: number,
  windowMs: number,
  endpoint: string,
): CCMRateLimitResult {
  const now = Date.now();
  const key = `${identifier}:${endpoint}`;
  let bucket = fallbackBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    fallbackBuckets.set(key, bucket);
  }

  bucket.count++;
  const allowed = bucket.count <= limit;
  const remaining = Math.max(0, limit - bucket.count);
  const resetAt = new Date(bucket.resetAt);

  const result: CCMRateLimitResult = { allowed, remaining, limit, resetAt };

  if (!allowed) {
    result.retryAfterMs = bucket.resetAt - now;
  }

  return result;
}

// ---- Resolve endpoint from path ----

function resolveEndpoint(endpoint: string): CCMEndpoint {
  if (endpoint.includes("analysis") || endpoint.includes("analyze")) return "analysis";
  if (endpoint.includes("sync")) return "sync";
  if (endpoint.includes("report")) return "report";
  if (endpoint.includes("remediation") || endpoint.includes("remediate")) return "remediation";
  // Default to analysis (most restrictive per-minute)
  return "analysis";
}

// ---- Public API ----

export async function checkCCMRateLimit(
  organizationId: string,
  tier: CCMTier,
  endpoint: string,
): Promise<CCMRateLimitResult> {
  const resolvedEndpoint = resolveEndpoint(endpoint);
  const config = CCM_RATE_LIMITS[tier][resolvedEndpoint];

  if (config.limit === 0) {
    return {
      allowed: false,
      remaining: 0,
      limit: 0,
      resetAt: new Date(),
      retryAfterMs: 0,
    };
  }

  try {
    const limiter = getLimiter(config.windowMs, config.limit);
    const key = `${tier}:${organizationId}:${resolvedEndpoint}`;

    const result = await limiter.limit(key);
    const rateLimitResult: CCMRateLimitResult = {
      allowed: result.success,
      remaining: result.remaining,
      limit: result.limit,
      resetAt: new Date(result.reset),
    };

    if (!result.success) {
      rateLimitResult.retryAfterMs = result.reset - Date.now();
    }

    return rateLimitResult;
  } catch {
    // Redis unavailable — fall back to in-memory
    return checkRateLimitInMemory(
      organizationId,
      config.limit,
      config.windowMs,
      resolvedEndpoint,
    );
  }
}

/** Clean up expired in-memory fallback buckets. Returns count of cleaned entries. */
export function cleanupCCMBuckets(): number {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, bucket] of Array.from(fallbackBuckets.entries())) {
    if (now > bucket.resetAt) {
      fallbackBuckets.delete(key);
      cleaned++;
    }
  }
  return cleaned;
}

/** Reset all state (for testing). */
export function resetCCMRateLimits(): void {
  fallbackBuckets.clear();
  limiters.clear();
}
