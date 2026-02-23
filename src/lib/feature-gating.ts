import { db } from "@/lib/db";

// ============================================
// SUBSCRIPTION TIER SYSTEM
// ============================================

export type Tier = "free" | "starter" | "professional" | "enterprise";

interface TierLimits {
  jurisdictions: number; // -1 = unlimited
  vendorAssessments: number;
  erpAnalyses: number;
  alerts: boolean;
  apiAccess: boolean;
}

const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: {
    jurisdictions: 1,
    vendorAssessments: 0,
    erpAnalyses: 0,
    alerts: false,
    apiAccess: false,
  },
  starter: {
    jurisdictions: 3,
    vendorAssessments: 5,
    erpAnalyses: 0,
    alerts: true,
    apiAccess: false,
  },
  professional: {
    jurisdictions: 10,
    vendorAssessments: 25,
    erpAnalyses: 10,
    alerts: true,
    apiAccess: false,
  },
  enterprise: {
    jurisdictions: -1,
    vendorAssessments: -1,
    erpAnalyses: -1,
    alerts: true,
    apiAccess: true,
  },
};

// Map Stripe price IDs to tier names
const PRICE_TO_TIER: Record<string, Tier> = {};

function initPriceTierMap() {
  const starter = process.env.STRIPE_PRICE_SUB_STARTER;
  const pro = process.env.STRIPE_PRICE_SUB_PRO;
  const enterprise = process.env.STRIPE_PRICE_SUB_ENTERPRISE;

  if (starter) PRICE_TO_TIER[starter] = "starter";
  if (pro) PRICE_TO_TIER[pro] = "professional";
  if (enterprise) PRICE_TO_TIER[enterprise] = "enterprise";
}

export async function getUserTier(userId: string): Promise<Tier> {
  initPriceTierMap();

  const subscription = await db.subscription.findUnique({
    where: { userId },
  });

  if (
    !subscription ||
    (subscription.status !== "ACTIVE" && subscription.status !== "TRIALING")
  ) {
    return "free";
  }

  return PRICE_TO_TIER[subscription.stripePriceId] || "free";
}

export function getTierLimits(tier: Tier): TierLimits {
  return TIER_LIMITS[tier];
}

// ============================================
// FEATURE ACCESS CHECKS
// ============================================

type Feature = "vendor_assessment" | "erp_analysis" | "alerts" | "api_access";

interface FeatureAccessResult {
  allowed: boolean;
  tier: Tier;
  limit: number;
  used: number;
  upgradeRequired?: boolean;
}

export async function checkFeatureAccess(
  userId: string,
  feature: Feature,
): Promise<FeatureAccessResult> {
  const tier = await getUserTier(userId);
  const limits = TIER_LIMITS[tier];

  // Boolean features (alerts, apiAccess)
  if (feature === "alerts") {
    return { allowed: limits.alerts, tier, limit: 0, used: 0, upgradeRequired: !limits.alerts };
  }
  if (feature === "api_access") {
    return { allowed: limits.apiAccess, tier, limit: 0, used: 0, upgradeRequired: !limits.apiAccess };
  }

  // Usage-based features
  const limitKey = feature === "vendor_assessment" ? "vendorAssessments" : "erpAnalyses";
  const limit = limits[limitKey];

  // Unlimited
  if (limit === -1) {
    return { allowed: true, tier, limit: -1, used: 0 };
  }

  // Not available on this tier
  if (limit === 0) {
    return { allowed: false, tier, limit: 0, used: 0, upgradeRequired: true };
  }

  // Check usage for current month
  const company = await db.companyProfile.findUnique({ where: { userId } });
  if (!company) {
    return { allowed: false, tier, limit, used: 0, upgradeRequired: false };
  }

  const month = getCurrentMonth();
  const usage = await db.usageRecord.findUnique({
    where: { companyId_feature_month: { companyId: company.id, feature, month } },
  });

  const used = usage?.count || 0;
  return {
    allowed: used < limit,
    tier,
    limit,
    used,
    upgradeRequired: used >= limit,
  };
}

// ============================================
// USAGE TRACKING
// ============================================

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function incrementUsage(
  companyId: string,
  feature: string,
): Promise<number> {
  const month = getCurrentMonth();

  const record = await db.usageRecord.upsert({
    where: { companyId_feature_month: { companyId, feature, month } },
    update: { count: { increment: 1 } },
    create: { companyId, feature, month, count: 1 },
  });

  return record.count;
}

export async function getUsage(
  companyId: string,
  feature: string,
): Promise<number> {
  const month = getCurrentMonth();

  const record = await db.usageRecord.findUnique({
    where: { companyId_feature_month: { companyId, feature, month } },
  });

  return record?.count || 0;
}
