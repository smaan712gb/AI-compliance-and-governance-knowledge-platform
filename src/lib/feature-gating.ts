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
  // Phase 5: Enterprise GRC Tools
  policyMappings: number;
  incidentAssessments: number;
  boardReports: number;
  aiSystems: number;
  aiSystemAnalyses: number;
  riskEntries: number;
  riskAnalyses: number;
  dsarResponses: number;
  ropaEntries: number;
  dpaReviews: number;
}

const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: {
    jurisdictions: 1,
    vendorAssessments: 0,
    erpAnalyses: 0,
    alerts: false,
    apiAccess: false,
    policyMappings: 3,      // rate-limited (3/mo for free)
    incidentAssessments: 0,
    boardReports: 0,
    aiSystems: 0,
    aiSystemAnalyses: 0,
    riskEntries: 0,
    riskAnalyses: 0,
    dsarResponses: 3,       // rate-limited (3/mo for free)
    ropaEntries: 0,
    dpaReviews: 0,
  },
  starter: {
    jurisdictions: 3,
    vendorAssessments: 5,
    erpAnalyses: 0,
    alerts: true,
    apiAccess: false,
    policyMappings: 10,
    incidentAssessments: 5,
    boardReports: 0,
    aiSystems: 10,
    aiSystemAnalyses: 0,
    riskEntries: 25,
    riskAnalyses: 0,
    dsarResponses: 10,
    ropaEntries: 10,
    dpaReviews: 5,
  },
  professional: {
    jurisdictions: 10,
    vendorAssessments: 25,
    erpAnalyses: 10,
    alerts: true,
    apiAccess: false,
    policyMappings: 50,
    incidentAssessments: 25,
    boardReports: 10,
    aiSystems: 50,
    aiSystemAnalyses: 25,
    riskEntries: -1,
    riskAnalyses: 25,
    dsarResponses: 50,
    ropaEntries: 50,
    dpaReviews: 25,
  },
  enterprise: {
    jurisdictions: -1,
    vendorAssessments: -1,
    erpAnalyses: -1,
    alerts: true,
    apiAccess: true,
    policyMappings: -1,
    incidentAssessments: -1,
    boardReports: -1,
    aiSystems: -1,
    aiSystemAnalyses: -1,
    riskEntries: -1,
    riskAnalyses: -1,
    dsarResponses: -1,
    ropaEntries: -1,
    dpaReviews: -1,
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
  // Admin bypass: ADMIN and SUPER_ADMIN get enterprise tier
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") {
    return "enterprise";
  }

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

type Feature =
  | "vendor_assessment"
  | "erp_analysis"
  | "alerts"
  | "api_access"
  | "policy_mapping"
  | "incident_assessment"
  | "board_report"
  | "ai_system"
  | "ai_system_analysis"
  | "risk_entry"
  | "risk_analysis"
  | "dsar_response"
  | "ropa_entry"
  | "dpa_review";

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

  // Usage-based features: map feature name to TierLimits key
  const FEATURE_TO_LIMIT_KEY: Record<string, keyof TierLimits> = {
    vendor_assessment: "vendorAssessments",
    erp_analysis: "erpAnalyses",
    policy_mapping: "policyMappings",
    incident_assessment: "incidentAssessments",
    board_report: "boardReports",
    ai_system: "aiSystems",
    ai_system_analysis: "aiSystemAnalyses",
    risk_entry: "riskEntries",
    risk_analysis: "riskAnalyses",
    dsar_response: "dsarResponses",
    ropa_entry: "ropaEntries",
    dpa_review: "dpaReviews",
  };
  const limitKey = FEATURE_TO_LIMIT_KEY[feature];
  if (!limitKey) {
    return { allowed: false, tier, limit: 0, used: 0, upgradeRequired: true };
  }
  const limit = limits[limitKey] as number;

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
