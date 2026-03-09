import { describe, it, expect } from "vitest";
import { SENTINEL_TIER_LIMITS } from "../types";
import type { SentinelTier } from "../types";

describe("Sentinel Types & Constants", () => {
  describe("SENTINEL_TIER_LIMITS", () => {
    it("defines all 4 tiers", () => {
      const tiers: SentinelTier[] = ["FREE", "PRO", "EXPERT", "STRATEGIC"];
      for (const tier of tiers) {
        expect(SENTINEL_TIER_LIMITS[tier]).toBeDefined();
      }
    });

    it("FREE tier has lowest limits", () => {
      const free = SENTINEL_TIER_LIMITS.FREE;

      expect(free.requestsPerMinute).toBe(10);
      expect(free.requestsPerDay).toBe(100);
      expect(free.reasoningCallsPerDay).toBe(5);
      expect(free.screeningCallsPerDay).toBe(10);
      expect(free.apiAccess).toBe(false);
      expect(free.biasAudit).toBe(false);
      expect(free.supplyChainModule).toBe(false);
    });

    it("PRO tier unlocks API access and bias audit", () => {
      const pro = SENTINEL_TIER_LIMITS.PRO;

      expect(pro.apiAccess).toBe(true);
      expect(pro.biasAudit).toBe(true);
      expect(pro.supplyChainModule).toBe(false);
    });

    it("EXPERT tier unlocks supply chain module", () => {
      const expert = SENTINEL_TIER_LIMITS.EXPERT;

      expect(expert.apiAccess).toBe(true);
      expect(expert.biasAudit).toBe(true);
      expect(expert.supplyChainModule).toBe(true);
    });

    it("STRATEGIC tier has highest limits", () => {
      const strategic = SENTINEL_TIER_LIMITS.STRATEGIC;

      expect(strategic.requestsPerMinute).toBe(600);
      expect(strategic.requestsPerDay).toBe(100000);
      expect(strategic.reasoningCallsPerDay).toBe(5000);
      expect(strategic.screeningCallsPerDay).toBe(10000);
    });

    it("each tier has progressively higher limits", () => {
      const tiers: SentinelTier[] = ["FREE", "PRO", "EXPERT", "STRATEGIC"];

      for (let i = 1; i < tiers.length; i++) {
        const prev = SENTINEL_TIER_LIMITS[tiers[i - 1]];
        const curr = SENTINEL_TIER_LIMITS[tiers[i]];

        expect(curr.requestsPerMinute).toBeGreaterThanOrEqual(prev.requestsPerMinute);
        expect(curr.requestsPerDay).toBeGreaterThanOrEqual(prev.requestsPerDay);
        expect(curr.reasoningCallsPerDay).toBeGreaterThanOrEqual(prev.reasoningCallsPerDay);
        expect(curr.screeningCallsPerDay).toBeGreaterThanOrEqual(prev.screeningCallsPerDay);
      }
    });
  });
});
