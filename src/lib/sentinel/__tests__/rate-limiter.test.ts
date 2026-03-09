import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimits, cleanupStaleBuckets } from "../rate-limiter";

describe("Rate Limiter", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  describe("checkRateLimit", () => {
    it("allows first request", async () => {
      const result = await checkRateLimit("user1", "FREE", "general");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it("enforces daily reasoning limit for FREE tier", async () => {
      const userId = "free-user";

      // FREE tier: 5 reasoning calls/day
      for (let i = 0; i < 5; i++) {
        const result = await checkRateLimit(userId, "FREE", "reasoning");
        expect(result.allowed).toBe(true);
      }

      // 6th call should be denied
      const result = await checkRateLimit(userId, "FREE", "reasoning");
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("enforces daily screening limit for FREE tier", async () => {
      const userId = "free-user";

      // FREE tier: 10 screening calls/day
      for (let i = 0; i < 10; i++) {
        const result = await checkRateLimit(userId, "FREE", "screening");
        expect(result.allowed).toBe(true);
      }

      const result = await checkRateLimit(userId, "FREE", "screening");
      expect(result.allowed).toBe(false);
    });

    it("allows more calls for PRO tier", async () => {
      const userId = "pro-user";

      // PRO: 100 reasoning calls/day
      for (let i = 0; i < 100; i++) {
        const result = await checkRateLimit(userId, "PRO", "reasoning");
        expect(result.allowed).toBe(true);
      }

      const result = await checkRateLimit(userId, "PRO", "reasoning");
      expect(result.allowed).toBe(false);
    });

    it("tracks different endpoints independently", async () => {
      const userId = "test-user";

      // Use up all reasoning calls
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(userId, "FREE", "reasoning");
      }

      // Screening should still work
      const screenResult = await checkRateLimit(userId, "FREE", "screening");
      expect(screenResult.allowed).toBe(true);
    });

    it("tracks different users independently", async () => {
      // Use up user1's reasoning
      for (let i = 0; i < 5; i++) {
        await checkRateLimit("user1", "FREE", "reasoning");
      }

      // user2 should still have allowance
      const result = await checkRateLimit("user2", "FREE", "reasoning");
      expect(result.allowed).toBe(true);
    });

    it("returns correct remaining count", async () => {
      const result1 = await checkRateLimit("user1", "FREE", "reasoning");
      expect(result1.remaining).toBe(4); // 5 - 1

      const result2 = await checkRateLimit("user1", "FREE", "reasoning");
      expect(result2.remaining).toBe(3); // 5 - 2
    });

    it("includes reset time", async () => {
      const result = await checkRateLimit("user1", "FREE", "reasoning");
      expect(result.resetAt).toBeInstanceOf(Date);
      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("cleanupStaleBuckets", () => {
    it("returns number of cleaned buckets", async () => {
      // Create some requests
      await checkRateLimit("user1", "FREE", "reasoning");
      await checkRateLimit("user2", "FREE", "screening");

      // Nothing stale yet
      const cleaned = cleanupStaleBuckets();
      expect(cleaned).toBe(0);
    });
  });

  describe("resetRateLimits", () => {
    it("clears all buckets", async () => {
      // Fill up limits
      for (let i = 0; i < 5; i++) {
        await checkRateLimit("user1", "FREE", "reasoning");
      }

      // Should be blocked
      const blocked = await checkRateLimit("user1", "FREE", "reasoning");
      expect(blocked.allowed).toBe(false);

      // Reset
      resetRateLimits();

      // Should be allowed again
      const allowed = await checkRateLimit("user1", "FREE", "reasoning");
      expect(allowed.allowed).toBe(true);
    });
  });
});
