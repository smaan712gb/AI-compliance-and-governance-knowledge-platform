import { db } from "@/lib/db";

// ============================================
// CCM SUBSCRIPTION TIER SYSTEM
// ============================================

export type CCMTier = "none" | "starter" | "professional" | "enterprise";

interface CCMTierLimits {
  connectors: number; // -1 = unlimited
  members: number;
  rules: number;
  aiAnalyses: number;
  frameworks: string[];
  syncFrequencyHours: number;
  evidenceStorageMb: number;
  auditRetentionDays: number;
  byokProviders: string[]; // which LLM providers are allowed
}

const CCM_TIER_LIMITS: Record<CCMTier, CCMTierLimits> = {
  none: {
    connectors: 0,
    members: 0,
    rules: 0,
    aiAnalyses: 0,
    frameworks: [],
    syncFrequencyHours: 0,
    evidenceStorageMb: 0,
    auditRetentionDays: 0,
    byokProviders: [],
  },
  starter: {
    connectors: 1,
    members: 5,
    rules: 25,
    aiAnalyses: 100,
    frameworks: ["SOX"],
    syncFrequencyHours: 12,
    evidenceStorageMb: 1024,
    auditRetentionDays: 90,
    byokProviders: ["DEEPSEEK"],
  },
  professional: {
    connectors: 3,
    members: 15,
    rules: 100,
    aiAnalyses: 500,
    frameworks: ["SOX", "PCI_DSS", "AML_BSA"],
    syncFrequencyHours: 4,
    evidenceStorageMb: 10240,
    auditRetentionDays: 365,
    byokProviders: ["DEEPSEEK", "OPENAI", "ANTHROPIC", "AZURE_OPENAI", "GOOGLE_VERTEX"],
  },
  enterprise: {
    connectors: -1,
    members: -1,
    rules: -1,
    aiAnalyses: -1,
    frameworks: ["SOX", "PCI_DSS", "HIPAA", "AML_BSA", "GDPR", "ISO_27001", "NIST_CSF", "CUSTOM"],
    syncFrequencyHours: 1,
    evidenceStorageMb: 102400,
    auditRetentionDays: 2555, // ~7 years
    byokProviders: ["DEEPSEEK", "OPENAI", "ANTHROPIC", "AZURE_OPENAI", "GOOGLE_VERTEX"],
  },
};

// Map Stripe price IDs to CCM tiers
const CCM_PRICE_TO_TIER: Record<string, CCMTier> = {};

function initCCMPriceTierMap() {
  const starter = process.env.STRIPE_PRICE_CCM_STARTER;
  const pro = process.env.STRIPE_PRICE_CCM_PRO;
  const enterprise = process.env.STRIPE_PRICE_CCM_ENTERPRISE;

  if (starter) CCM_PRICE_TO_TIER[starter] = "starter";
  if (pro) CCM_PRICE_TO_TIER[pro] = "professional";
  if (enterprise) CCM_PRICE_TO_TIER[enterprise] = "enterprise";
}

/**
 * Get the CCM tier for an organization.
 */
export async function getOrgCCMTier(organizationId: string): Promise<CCMTier> {
  initCCMPriceTierMap();

  const subscription = await db.cCMSubscription.findUnique({
    where: { organizationId },
  });

  if (!subscription || (subscription.status !== "ACTIVE" && subscription.status !== "TRIALING")) {
    return "none";
  }

  // TRIALING subscriptions (auto-provisioned on org creation) always get Professional access
  if (subscription.status === "TRIALING") {
    return "professional";
  }

  return CCM_PRICE_TO_TIER[subscription.stripePriceId] || "none";
}

/**
 * Get the limits for a CCM tier.
 */
export function getCCMTierLimits(tier: CCMTier): CCMTierLimits {
  return CCM_TIER_LIMITS[tier];
}

type CCMFeature = "connector" | "member" | "rule" | "ai_analysis";

interface CCMFeatureAccessResult {
  allowed: boolean;
  tier: CCMTier;
  limit: number;
  used: number;
  upgradeRequired?: boolean;
}

/**
 * Check if an organization can use a CCM feature based on their tier and usage.
 */
export async function checkCCMFeatureAccess(
  organizationId: string,
  feature: CCMFeature
): Promise<CCMFeatureAccessResult> {
  const tier = await getOrgCCMTier(organizationId);
  const limits = CCM_TIER_LIMITS[tier];

  if (tier === "none") {
    return { allowed: false, tier, limit: 0, used: 0, upgradeRequired: true };
  }

  const featureLimitMap: Record<CCMFeature, number> = {
    connector: limits.connectors,
    member: limits.members,
    rule: limits.rules,
    ai_analysis: limits.aiAnalyses,
  };

  const limit = featureLimitMap[feature];

  // Unlimited
  if (limit === -1) {
    return { allowed: true, tier, limit: -1, used: 0 };
  }

  // Count current usage
  let used = 0;
  switch (feature) {
    case "connector":
      used = await db.eRPConnector.count({
        where: { organizationId, isActive: true },
      });
      break;
    case "member":
      used = await db.cCMOrganizationMember.count({
        where: { organizationId, isActive: true },
      });
      break;
    case "rule":
      used = await db.monitoringRule.count({
        where: { organizationId, isActive: true },
      });
      break;
    case "ai_analysis": {
      // Count AI analyses this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      used = await db.monitoringRun.count({
        where: {
          rule: { organizationId },
          startedAt: { gte: monthStart },
          aiTokensUsed: { gt: 0 },
        },
      });
      break;
    }
  }

  return {
    allowed: used < limit,
    tier,
    limit,
    used,
    upgradeRequired: used >= limit,
  };
}

/**
 * Check if a framework is available on the organization's tier.
 */
export async function isFrameworkAllowed(
  organizationId: string,
  framework: string
): Promise<boolean> {
  const tier = await getOrgCCMTier(organizationId);
  const limits = CCM_TIER_LIMITS[tier];
  return limits.frameworks.includes(framework);
}

/**
 * Check if an LLM provider is allowed on the organization's tier.
 * DeepSeek is always allowed — it's the platform's included default provider.
 */
export async function isProviderAllowed(
  organizationId: string,
  provider: string
): Promise<boolean> {
  // DeepSeek is the platform's own included provider — never blocked
  if (provider === "DEEPSEEK") return true;

  const tier = await getOrgCCMTier(organizationId);
  const limits = CCM_TIER_LIMITS[tier];
  return limits.byokProviders.includes(provider);
}
