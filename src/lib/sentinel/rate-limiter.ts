// ============================================
// SENTINEL — Tiered Rate Limiter (Upstash Redis)
// Production-grade sliding window rate limiting
// ============================================

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { SentinelTier, TierLimits } from "./types";
import { SENTINEL_TIER_LIMITS } from "./types";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
}

// ---- Redis Client (lazy-init) ----

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  _redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return _redis;
}

// ---- Rate Limiter Cache (one per window type) ----

const limiters = new Map<string, Ratelimit>();

function getLimiter(windowMs: number, limit: number): Ratelimit {
  const key = `${windowMs}:${limit}`;
  let limiter = limiters.get(key);
  if (limiter) return limiter;

  const redis = getRedis();
  if (!redis) {
    // Fallback: create ephemeral Redis that rejects (will trigger in-memory fallback)
    throw new Error("Redis not configured");
  }

  const windowSeconds = Math.ceil(windowMs / 1000);
  const windowStr = `${windowSeconds} s` as `${number} s`;

  limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, windowStr),
    prefix: "sentinel:rl",
    analytics: false,
  });

  limiters.set(key, limiter);
  return limiter;
}

// ---- In-memory fallback (if Redis unavailable) ----

const fallbackBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimitInMemory(
  identifier: string,
  limit: number,
  windowMs: number,
  endpoint: string,
): RateLimitResult {
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

  return { allowed, remaining, limit, resetAt: new Date(bucket.resetAt) };
}

// ---- Public API ----

export async function checkRateLimit(
  identifier: string,
  tier: SentinelTier,
  endpoint: string,
): Promise<RateLimitResult> {
  const limits = SENTINEL_TIER_LIMITS[tier];
  const limit = getEndpointLimit(limits, endpoint);
  const windowMs = getWindowMs(endpoint);

  try {
    const limiter = getLimiter(windowMs, limit);
    const key = `${tier}:${identifier}:${endpoint}`;

    const result = await limiter.limit(key);

    return {
      allowed: result.success,
      remaining: result.remaining,
      limit: result.limit,
      resetAt: new Date(result.reset),
    };
  } catch {
    // Redis unavailable — fall back to in-memory
    return checkRateLimitInMemory(identifier, limit, windowMs, endpoint);
  }
}

function getEndpointLimit(limits: TierLimits, endpoint: string): number {
  if (endpoint.includes("reasoning")) return limits.reasoningCallsPerDay;
  if (endpoint.includes("screening")) return limits.screeningCallsPerDay;
  if (endpoint.includes("supply-chain")) return limits.supplyChainAssessments;
  return limits.requestsPerMinute;
}

function getWindowMs(endpoint: string): number {
  if (endpoint.includes("reasoning")) return 86400000;
  if (endpoint.includes("screening")) return 86400000;
  if (endpoint.includes("supply-chain")) return 86400000;
  return 60000;
}

// Clean up stale in-memory buckets (only for fallback mode)
export function cleanupStaleBuckets(): number {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, bucket] of fallbackBuckets) {
    if (now > bucket.resetAt) {
      fallbackBuckets.delete(key);
      cleaned++;
    }
  }
  return cleaned;
}

// Reset for testing
export function resetRateLimits(): void {
  fallbackBuckets.clear();
  limiters.clear();
}
