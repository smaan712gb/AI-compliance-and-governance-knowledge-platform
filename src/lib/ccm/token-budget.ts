// ============================================
// CCM — Token Budget Management
// Daily/monthly limits to prevent runaway AI costs
// ============================================

import { db } from "@/lib/db";
import { getOrgCCMTier } from "@/lib/ccm/feature-gating";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  model: string;
  provider: string;
  operation: string; // 'analysis', 'reasoning', 'remediation', 'report'
}

export interface BudgetStatus {
  dailyUsed: number;
  dailyLimit: number;
  dailyRemaining: number;
  monthlyUsed: number;
  monthlyLimit: number;
  monthlyRemaining: number;
  isOverBudget: boolean;
  recommendedAction: "PROCEED" | "THROTTLE" | "BLOCK";
}

// ---- Cost rates per 1M tokens ----

const COST_PER_MILLION: Record<string, number> = {
  "deepseek-reasoner": 2.0,
  "deepseek-chat": 0.14,
  "gpt-4o": 5.0,
  "gpt-4o-mini": 0.15,
  "gpt-4-turbo": 10.0,
  "gpt-4": 30.0,
  "gpt-3.5-turbo": 0.5,
  "gemini-1.5-pro": 3.5,
  "gemini-1.5-flash": 0.075,
  "gemini-2.0-flash": 0.1,
};

const DEFAULT_COST_PER_MILLION = 1.0;

// ---- Tier limits ----

interface TierBudgetLimits {
  dailyTokens: number; // -1 = unlimited
  monthlyTokens: number; // -1 = unlimited
}

const TIER_LIMITS: Record<string, TierBudgetLimits> = {
  none: { dailyTokens: 0, monthlyTokens: 0 },
  starter: { dailyTokens: 50_000, monthlyTokens: 1_000_000 },
  professional: { dailyTokens: 200_000, monthlyTokens: 5_000_000 },
  enterprise: { dailyTokens: -1, monthlyTokens: -1 },
};

/**
 * Estimate cost in USD for a given number of tokens and model.
 */
export function estimateCost(
  totalTokens: number,
  model: string
): number {
  const rate = COST_PER_MILLION[model] ?? DEFAULT_COST_PER_MILLION;
  return (totalTokens / 1_000_000) * rate;
}

/**
 * Track token usage by creating a CCMAuditLog entry with action='RUN_AI_ANALYSIS'.
 * The details JSON stores the full token usage breakdown.
 */
export async function trackTokenUsage(
  organizationId: string,
  usage: TokenUsage
): Promise<void> {
  const totalTokens = usage.inputTokens + usage.outputTokens + usage.reasoningTokens;
  const cost = estimateCost(totalTokens, usage.model);

  await db.cCMAuditLog.create({
    data: {
      organizationId,
      userId: "system",
      action: "RUN_AI_ANALYSIS",
      resourceType: "TOKEN_USAGE",
      details: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        reasoningTokens: usage.reasoningTokens,
        totalTokens,
        model: usage.model,
        provider: usage.provider,
        operation: usage.operation,
        costUsd: cost,
      },
    },
  });
}

/**
 * Query total token usage for a given time window from audit logs.
 */
async function queryTokenUsage(
  organizationId: string,
  since: Date
): Promise<number> {
  const logs = await db.cCMAuditLog.findMany({
    where: {
      organizationId,
      action: "RUN_AI_ANALYSIS",
      resourceType: "TOKEN_USAGE",
      timestamp: { gte: since },
    },
    select: { details: true },
  });

  let total = 0;
  for (const log of logs) {
    const details = log.details as Record<string, unknown> | null;
    if (details && typeof details.totalTokens === "number") {
      total += details.totalTokens;
    }
  }
  return total;
}

/**
 * Check whether the organization has remaining token budget before making an LLM call.
 */
export async function checkTokenBudget(
  organizationId: string,
  estimatedTokens: number
): Promise<BudgetStatus> {
  const tier = await getOrgCCMTier(organizationId);
  const limits = TIER_LIMITS[tier] ?? TIER_LIMITS.none;

  // Unlimited tier — always proceed
  if (limits.dailyTokens === -1 && limits.monthlyTokens === -1) {
    return {
      dailyUsed: 0,
      dailyLimit: -1,
      dailyRemaining: -1,
      monthlyUsed: 0,
      monthlyLimit: -1,
      monthlyRemaining: -1,
      isOverBudget: false,
      recommendedAction: "PROCEED",
    };
  }

  // No budget at all — block
  if (limits.dailyTokens === 0 && limits.monthlyTokens === 0) {
    return {
      dailyUsed: 0,
      dailyLimit: 0,
      dailyRemaining: 0,
      monthlyUsed: 0,
      monthlyLimit: 0,
      monthlyRemaining: 0,
      isOverBudget: true,
      recommendedAction: "BLOCK",
    };
  }

  const now = new Date();

  // Start of today (UTC)
  const startOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  // Start of month (UTC)
  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );

  const [dailyUsed, monthlyUsed] = await Promise.all([
    queryTokenUsage(organizationId, startOfDay),
    queryTokenUsage(organizationId, startOfMonth),
  ]);

  const dailyRemaining =
    limits.dailyTokens === -1
      ? -1
      : Math.max(0, limits.dailyTokens - dailyUsed);

  const monthlyRemaining =
    limits.monthlyTokens === -1
      ? -1
      : Math.max(0, limits.monthlyTokens - monthlyUsed);

  // Determine if over budget
  const dailyOverBudget =
    limits.dailyTokens !== -1 && dailyUsed + estimatedTokens > limits.dailyTokens;
  const monthlyOverBudget =
    limits.monthlyTokens !== -1 && monthlyUsed + estimatedTokens > limits.monthlyTokens;

  const isOverBudget = dailyOverBudget || monthlyOverBudget;

  // Determine recommended action
  let recommendedAction: "PROCEED" | "THROTTLE" | "BLOCK";
  if (isOverBudget) {
    // If over by more than 20%, block. Otherwise throttle (allow but warn).
    const dailyPct =
      limits.dailyTokens > 0 ? dailyUsed / limits.dailyTokens : 0;
    const monthlyPct =
      limits.monthlyTokens > 0 ? monthlyUsed / limits.monthlyTokens : 0;

    if (dailyPct > 1.2 || monthlyPct > 1.2) {
      recommendedAction = "BLOCK";
    } else {
      recommendedAction = "THROTTLE";
    }
  } else {
    // If we're above 80% of daily or monthly, throttle
    const dailyPct =
      limits.dailyTokens > 0 ? dailyUsed / limits.dailyTokens : 0;
    const monthlyPct =
      limits.monthlyTokens > 0 ? monthlyUsed / limits.monthlyTokens : 0;

    if (dailyPct > 0.8 || monthlyPct > 0.8) {
      recommendedAction = "THROTTLE";
    } else {
      recommendedAction = "PROCEED";
    }
  }

  return {
    dailyUsed,
    dailyLimit: limits.dailyTokens,
    dailyRemaining,
    monthlyUsed,
    monthlyLimit: limits.monthlyTokens,
    monthlyRemaining,
    isOverBudget,
    recommendedAction,
  };
}

/**
 * Get token usage summary for dashboard display.
 */
export async function getTokenUsageSummary(
  organizationId: string,
  period: "day" | "week" | "month"
): Promise<{
  totalTokens: number;
  totalCost: number;
  byOperation: Record<string, number>;
  byModel: Record<string, number>;
  trend: { date: string; tokens: number }[];
}> {
  const now = new Date();
  let since: Date;

  switch (period) {
    case "day":
      since = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      );
      break;
    case "week":
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      since = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
      );
      break;
  }

  const logs = await db.cCMAuditLog.findMany({
    where: {
      organizationId,
      action: "RUN_AI_ANALYSIS",
      resourceType: "TOKEN_USAGE",
      timestamp: { gte: since },
    },
    select: { details: true, timestamp: true },
    orderBy: { timestamp: "asc" },
  });

  let totalTokens = 0;
  let totalCost = 0;
  const byOperation: Record<string, number> = {};
  const byModel: Record<string, number> = {};
  const trendMap: Record<string, number> = {};

  for (const log of logs) {
    const details = log.details as Record<string, unknown> | null;
    if (!details) continue;

    const tokens =
      typeof details.totalTokens === "number" ? details.totalTokens : 0;
    const cost =
      typeof details.costUsd === "number" ? details.costUsd : 0;
    const operation =
      typeof details.operation === "string" ? details.operation : "unknown";
    const model =
      typeof details.model === "string" ? details.model : "unknown";

    totalTokens += tokens;
    totalCost += cost;
    byOperation[operation] = (byOperation[operation] || 0) + tokens;
    byModel[model] = (byModel[model] || 0) + tokens;

    // Group by date for trend
    const dateKey = log.timestamp.toISOString().split("T")[0];
    trendMap[dateKey] = (trendMap[dateKey] || 0) + tokens;
  }

  const trend = Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, tokens]) => ({ date, tokens }));

  return {
    totalTokens,
    totalCost: Math.round(totalCost * 10000) / 10000, // 4 decimal places
    byOperation,
    byModel,
    trend,
  };
}
