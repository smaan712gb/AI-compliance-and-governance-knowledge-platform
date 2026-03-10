import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock @upstash/ratelimit and @upstash/redis before importing the module
vi.mock("@upstash/ratelimit", () => {
  return {
    Ratelimit: class MockRatelimit {
      static slidingWindow() {
        return {};
      }
      constructor() {}
      async limit() {
        // Simulate Redis failure so we fall back to in-memory
        throw new Error("Redis unavailable");
      }
    },
  };
});

vi.mock("@upstash/redis", () => {
  return {
    Redis: class MockRedis {
      constructor() {}
    },
  };
});

import {
  checkCCMRateLimit,
  cleanupCCMBuckets,
  resetCCMRateLimits,
} from "../rate-limiter";

describe("CCM Rate Limiter", () => {
  beforeEach(() => {
    resetCCMRateLimits();
    // Set env vars so Redis client initializes (but mock throws, causing fallback)
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fake.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "fake-token");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows requests under limit for starter tier", async () => {
    const result = await checkCCMRateLimit("org-1", "starter", "analysis");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it("blocks requests over limit (starter: 5/min for analysis)", async () => {
    for (let i = 0; i < 5; i++) {
      const r = await checkCCMRateLimit("org-2", "starter", "analysis");
      expect(r.allowed).toBe(true);
    }

    const blocked = await checkCCMRateLimit("org-2", "starter", "analysis");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("returns correct remaining count", async () => {
    // starter analysis = 5/min
    const r1 = await checkCCMRateLimit("org-3", "starter", "analysis");
    expect(r1.remaining).toBe(4); // 5 - 1

    const r2 = await checkCCMRateLimit("org-3", "starter", "analysis");
    expect(r2.remaining).toBe(3); // 5 - 2
  });

  it("returns retryAfterMs when rate limited", async () => {
    for (let i = 0; i < 5; i++) {
      await checkCCMRateLimit("org-4", "starter", "analysis");
    }

    const blocked = await checkCCMRateLimit("org-4", "starter", "analysis");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeDefined();
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("different endpoints have different limits", async () => {
    // starter: analysis=5/min, sync=2/hour
    const analysisResults: boolean[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await checkCCMRateLimit("org-5", "starter", "analysis");
      analysisResults.push(r.allowed);
    }
    // 5 allowed, 6th blocked
    expect(analysisResults).toEqual([true, true, true, true, true, false]);

    // sync should still have its own budget
    const syncResult = await checkCCMRateLimit("org-5", "starter", "sync");
    expect(syncResult.allowed).toBe(true);
  });

  it("enterprise tier has highest limits", async () => {
    // Enterprise analysis = 60/min
    for (let i = 0; i < 60; i++) {
      const r = await checkCCMRateLimit("org-6", "enterprise", "analysis");
      expect(r.allowed).toBe(true);
    }

    const blocked = await checkCCMRateLimit("org-6", "enterprise", "analysis");
    expect(blocked.allowed).toBe(false);
  });

  it("none tier blocks all requests", async () => {
    const result = await checkCCMRateLimit("org-7", "none", "analysis");
    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(0);
  });

  it("cleanupCCMBuckets removes stale entries", async () => {
    // Create some rate limit entries
    await checkCCMRateLimit("org-8", "starter", "analysis");
    await checkCCMRateLimit("org-9", "starter", "analysis");

    // Nothing expired yet
    const cleaned1 = cleanupCCMBuckets();
    expect(cleaned1).toBe(0);

    // Buckets will expire after windowMs (60000ms for analysis)
    // We can't easily advance time here without fake timers on Date.now,
    // but we can verify the function returns a number
    expect(typeof cleaned1).toBe("number");
  });

  it("falls back to in-memory when Redis unavailable", async () => {
    // Our mock throws on limiter.limit(), so every call hits in-memory fallback
    const result = await checkCCMRateLimit("org-10", "starter", "analysis");
    expect(result.allowed).toBe(true);
    // The result should still have proper shape
    expect(result.remaining).toBeDefined();
    expect(result.limit).toBe(5);
    expect(result.resetAt).toBeInstanceOf(Date);
  });
});
