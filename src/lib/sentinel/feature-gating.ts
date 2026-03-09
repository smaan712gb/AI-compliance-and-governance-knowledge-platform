// ============================================
// SENTINEL — Feature Gating & Tier Management
// ============================================

import { db } from "@/lib/db";
import type { SentinelTier, TierLimits } from "./types";
import { SENTINEL_TIER_LIMITS } from "./types";

export async function getUserSentinelTier(userId: string): Promise<SentinelTier> {
  // Platform admins get full STRATEGIC access without subscription
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") {
    return "STRATEGIC";
  }

  const sub = await db.sentinelSubscription.findUnique({
    where: { userId },
    select: { tier: true, status: true },
  });

  if (!sub || sub.status !== "ACTIVE") {
    return "FREE";
  }

  return sub.tier as SentinelTier;
}

export function getSentinelTierLimits(tier: SentinelTier): TierLimits {
  return SENTINEL_TIER_LIMITS[tier];
}

export function checkFeatureAccess(
  tier: SentinelTier,
  feature: "api" | "biasAudit" | "supplyChain"
): boolean {
  const limits = SENTINEL_TIER_LIMITS[tier];
  switch (feature) {
    case "api":
      return limits.apiAccess;
    case "biasAudit":
      return limits.biasAudit;
    case "supplyChain":
      return limits.supplyChainModule;
  }
}

export const SENTINEL_PRICE_MAP: Record<string, string> = {
  pro: (process.env.STRIPE_PRICE_SENTINEL_PRO || "").trim(),
  expert: (process.env.STRIPE_PRICE_SENTINEL_EXPERT || "").trim(),
  strategic: (process.env.STRIPE_PRICE_SENTINEL_STRATEGIC || "").trim(),
};

export function getPriceIdForTier(
  plan: string
): string | null {
  return SENTINEL_PRICE_MAP[plan] || null;
}

export function getTierFromPriceId(priceId: string): SentinelTier {
  for (const [plan, id] of Object.entries(SENTINEL_PRICE_MAP)) {
    if (id === priceId) {
      switch (plan) {
        case "pro": return "PRO";
        case "expert": return "EXPERT";
        case "strategic": return "STRATEGIC";
      }
    }
  }
  return "FREE";
}
