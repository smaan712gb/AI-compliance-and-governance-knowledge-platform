// ============================================
// SENTINEL — Historical Reasoning Memory
// "What happened before, what signals preceded escalation"
// ============================================

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { EventCategory } from "./types";

// ---- Types ----

export interface StoreReasoningParams {
  userId: string;
  eventId?: string;
  headline: string;
  countryCode?: string;
  category: EventCategory;
  inputContext: string;
  reasoningChain: string;
  classification: {
    category: EventCategory;
    severity: string;
    riskScore: number;
    [key: string]: unknown;
  };
  predictedOutcome?: string;
  biasAudit?: Record<string, unknown>;
  tokens?: number;
  latencyMs?: number;
}

export interface ReasoningHistoryFilters {
  countryCode?: string;
  category?: EventCategory;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface ReasoningHistoryEntry {
  id: string;
  userId: string;
  eventId: string | null;
  headline: string;
  countryCode: string | null;
  category: string;
  inputContext: string;
  reasoningChain: string;
  classification: unknown;
  predictedOutcome: string | null;
  actualOutcome: string | null;
  forecastAccuracy: number | null;
  biasAudit: unknown;
  tokens: number;
  latencyMs: number;
  createdAt: Date;
}

export interface ForecastAccuracyStats {
  totalForecasts: number;
  forecastsWithOutcomes: number;
  averageAccuracy: number | null;
  accuracyByCategory: Record<string, { count: number; avgAccuracy: number }>;
  accuracyByCountry: Record<string, { count: number; avgAccuracy: number }>;
}

export interface PrecedentMatch {
  id: string;
  headline: string;
  countryCode: string | null;
  category: string;
  classification: unknown;
  predictedOutcome: string | null;
  actualOutcome: string | null;
  forecastAccuracy: number | null;
  createdAt: Date;
  relevanceScore: number;
}

export interface EscalationPattern {
  countryCode: string;
  sequence: {
    id: string;
    headline: string;
    category: string;
    riskScore: number;
    createdAt: Date;
  }[];
  escalationDelta: number;
  signalsBefore: string[];
}

export interface ReasoningStats {
  totalCalls: number;
  byCategory: Record<string, number>;
  avgRiskScore: number;
  forecastAccuracy: ForecastAccuracyStats;
  topCountries: { countryCode: string; count: number }[];
}

// ---- 1. Store Reasoning ----

export async function storeReasoning(
  params: StoreReasoningParams
): Promise<ReasoningHistoryEntry> {
  const entry = await db.reasoningHistory.create({
    data: {
      userId: params.userId,
      eventId: params.eventId ?? null,
      headline: params.headline,
      countryCode: params.countryCode ?? null,
      category: params.category,
      inputContext: params.inputContext,
      reasoningChain: params.reasoningChain,
      classification: params.classification as unknown as Prisma.InputJsonValue,
      predictedOutcome: params.predictedOutcome ?? null,
      biasAudit: params.biasAudit
        ? (params.biasAudit as unknown as Prisma.InputJsonValue)
        : undefined,
      tokens: params.tokens ?? 0,
      latencyMs: params.latencyMs ?? 0,
    },
  });

  return entry as unknown as ReasoningHistoryEntry;
}

// ---- 2. Get Reasoning History (paginated) ----

export async function getReasoningHistory(
  userId: string,
  filters?: ReasoningHistoryFilters
): Promise<{ entries: ReasoningHistoryEntry[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, filters?.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters?.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { userId };

  if (filters?.countryCode) {
    where.countryCode = filters.countryCode.toUpperCase();
  }
  if (filters?.category) {
    where.category = filters.category;
  }
  if (filters?.dateFrom || filters?.dateTo) {
    const createdAt: Record<string, Date> = {};
    if (filters.dateFrom) createdAt.gte = filters.dateFrom;
    if (filters.dateTo) createdAt.lte = filters.dateTo;
    where.createdAt = createdAt;
  }

  const [entries, total] = await Promise.all([
    db.reasoningHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.reasoningHistory.count({ where }),
  ]);

  return {
    entries: entries as unknown as ReasoningHistoryEntry[],
    total,
    page,
    limit,
  };
}

// ---- 3. Record Actual Outcome ----

export async function recordActualOutcome(
  id: string,
  userId: string,
  actualOutcome: string,
  forecastAccuracy: number
): Promise<ReasoningHistoryEntry> {
  // Verify ownership BEFORE updating
  const existing = await db.reasoningHistory.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!existing) {
    throw new Error("Not found: reasoning history entry does not exist");
  }
  if (existing.userId !== userId) {
    throw new Error("Unauthorized: entry does not belong to user");
  }

  // Clamp accuracy to 0-1
  const clampedAccuracy = Math.max(0, Math.min(1, forecastAccuracy));

  const entry = await db.reasoningHistory.update({
    where: { id },
    data: {
      actualOutcome,
      forecastAccuracy: clampedAccuracy,
    },
  });

  return entry as unknown as ReasoningHistoryEntry;
}

// ---- 4. Get Forecast Accuracy ----

export async function getForecastAccuracy(
  userId: string,
  filters?: Pick<ReasoningHistoryFilters, "countryCode" | "category" | "dateFrom" | "dateTo">
): Promise<ForecastAccuracyStats> {
  const where: Record<string, unknown> = { userId };

  if (filters?.countryCode) {
    where.countryCode = filters.countryCode.toUpperCase();
  }
  if (filters?.category) {
    where.category = filters.category;
  }
  if (filters?.dateFrom || filters?.dateTo) {
    const createdAt: Record<string, Date> = {};
    if (filters?.dateFrom) createdAt.gte = filters.dateFrom;
    if (filters?.dateTo) createdAt.lte = filters.dateTo;
    where.createdAt = createdAt;
  }

  // Total forecasts (entries with a predictedOutcome)
  const totalForecasts = await db.reasoningHistory.count({
    where: { ...where, predictedOutcome: { not: null } },
  });

  // Entries with recorded accuracy
  const withOutcomes = await db.reasoningHistory.findMany({
    where: { ...where, forecastAccuracy: { not: null } },
    select: {
      forecastAccuracy: true,
      category: true,
      countryCode: true,
    },
  });

  const forecastsWithOutcomes = withOutcomes.length;

  // Average accuracy
  const averageAccuracy =
    forecastsWithOutcomes > 0
      ? withOutcomes.reduce((sum, e) => sum + (e.forecastAccuracy ?? 0), 0) /
        forecastsWithOutcomes
      : null;

  // Accuracy by category
  const accuracyByCategory: Record<string, { count: number; avgAccuracy: number }> = {};
  for (const entry of withOutcomes) {
    const cat = entry.category;
    if (!accuracyByCategory[cat]) {
      accuracyByCategory[cat] = { count: 0, avgAccuracy: 0 };
    }
    accuracyByCategory[cat].count++;
    accuracyByCategory[cat].avgAccuracy += entry.forecastAccuracy ?? 0;
  }
  for (const cat of Object.keys(accuracyByCategory)) {
    accuracyByCategory[cat].avgAccuracy /= accuracyByCategory[cat].count;
  }

  // Accuracy by country
  const accuracyByCountry: Record<string, { count: number; avgAccuracy: number }> = {};
  for (const entry of withOutcomes) {
    const cc = entry.countryCode ?? "UNKNOWN";
    if (!accuracyByCountry[cc]) {
      accuracyByCountry[cc] = { count: 0, avgAccuracy: 0 };
    }
    accuracyByCountry[cc].count++;
    accuracyByCountry[cc].avgAccuracy += entry.forecastAccuracy ?? 0;
  }
  for (const cc of Object.keys(accuracyByCountry)) {
    accuracyByCountry[cc].avgAccuracy /= accuracyByCountry[cc].count;
  }

  return {
    totalForecasts,
    forecastsWithOutcomes,
    averageAccuracy,
    accuracyByCategory,
    accuracyByCountry,
  };
}

// ---- 5. Find Similar Precedents ----

export async function findSimilarPrecedents(params: {
  headline: string;
  countryCode?: string;
  category?: EventCategory;
}): Promise<PrecedentMatch[]> {
  // Extract keywords from headline (strip common words, keep meaningful terms)
  const stopWords = new Set([
    "the", "a", "an", "in", "on", "at", "to", "for", "of", "and", "or",
    "is", "are", "was", "were", "be", "been", "has", "have", "had",
    "with", "from", "by", "that", "this", "it", "its", "as", "but",
    "not", "will", "would", "could", "should", "may", "might", "can",
    "do", "does", "did", "over", "new", "says", "said",
  ]);

  const keywords = params.headline
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  if (keywords.length === 0) {
    return [];
  }

  // Build conditions for matching: same country, same category, or keyword overlap
  const orConditions: Record<string, unknown>[] = [];

  if (params.countryCode) {
    orConditions.push({ countryCode: params.countryCode.toUpperCase() });
  }
  if (params.category) {
    orConditions.push({ category: params.category });
  }

  // Keyword matching — search for entries containing any of the keywords
  for (const keyword of keywords.slice(0, 8)) {
    orConditions.push({
      headline: { contains: keyword, mode: "insensitive" },
    });
  }

  if (orConditions.length === 0) {
    return [];
  }

  const candidates = await db.reasoningHistory.findMany({
    where: {
      OR: orConditions,
    },
    orderBy: { createdAt: "desc" },
    take: 50, // Fetch more than needed, then rank
    select: {
      id: true,
      headline: true,
      countryCode: true,
      category: true,
      classification: true,
      predictedOutcome: true,
      actualOutcome: true,
      forecastAccuracy: true,
      createdAt: true,
    },
  });

  // Score each candidate by relevance
  const scored: PrecedentMatch[] = candidates.map((c) => {
    let score = 0;

    // Country match: +30
    if (
      params.countryCode &&
      c.countryCode?.toUpperCase() === params.countryCode.toUpperCase()
    ) {
      score += 30;
    }

    // Category match: +25
    if (params.category && c.category === params.category) {
      score += 25;
    }

    // Keyword overlap: +10 per matching keyword (max 50)
    const candidateWords = c.headline.toLowerCase().split(/\s+/);
    let keywordHits = 0;
    for (const kw of keywords) {
      if (candidateWords.some((w) => w.includes(kw) || kw.includes(w))) {
        keywordHits++;
      }
    }
    score += Math.min(50, keywordHits * 10);

    // Bonus for entries with recorded outcomes: +5
    if (c.actualOutcome) {
      score += 5;
    }

    return {
      id: c.id,
      headline: c.headline,
      countryCode: c.countryCode,
      category: c.category,
      classification: c.classification,
      predictedOutcome: c.predictedOutcome,
      actualOutcome: c.actualOutcome,
      forecastAccuracy: c.forecastAccuracy,
      createdAt: c.createdAt,
      relevanceScore: score,
    };
  });

  // Sort by relevance descending, return top 5
  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return scored.slice(0, 5);
}

// ---- 6. Get Escalation Patterns ----

export async function getEscalationPatterns(
  countryCode: string
): Promise<EscalationPattern[]> {
  const entries = await db.reasoningHistory.findMany({
    where: { countryCode: countryCode.toUpperCase() },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      headline: true,
      category: true,
      classification: true,
      createdAt: true,
    },
  });

  if (entries.length < 2) {
    return [];
  }

  // Extract risk scores from classification JSON
  const withScores = entries.map((e) => {
    const cls = e.classification as Record<string, unknown> | null;
    const riskScore =
      typeof cls?.riskScore === "number" ? cls.riskScore : 0;
    return { ...e, riskScore };
  });

  // Find escalation sequences: consecutive entries where riskScore increases
  const patterns: EscalationPattern[] = [];
  let sequenceStart = 0;

  for (let i = 1; i < withScores.length; i++) {
    const prev = withScores[i - 1];
    const curr = withScores[i];

    if (curr.riskScore > prev.riskScore) {
      // Escalation continues
      continue;
    }

    // Escalation sequence ended at i-1
    if (i - 1 > sequenceStart) {
      const sequence = withScores.slice(sequenceStart, i);
      const delta =
        sequence[sequence.length - 1].riskScore - sequence[0].riskScore;

      // Only report significant escalations (delta >= 10)
      if (delta >= 10) {
        // Signals before escalation: categories and headlines of the first entries
        const signalsBefore = sequence
          .slice(0, Math.min(3, sequence.length))
          .map(
            (s) =>
              `[${s.category}] ${s.headline} (score: ${s.riskScore})`
          );

        patterns.push({
          countryCode: countryCode.toUpperCase(),
          sequence: sequence.map((s) => ({
            id: s.id,
            headline: s.headline,
            category: s.category,
            riskScore: s.riskScore,
            createdAt: s.createdAt,
          })),
          escalationDelta: delta,
          signalsBefore,
        });
      }
    }

    sequenceStart = i;
  }

  // Check final sequence
  if (withScores.length - 1 > sequenceStart) {
    const sequence = withScores.slice(sequenceStart);
    const delta =
      sequence[sequence.length - 1].riskScore - sequence[0].riskScore;

    if (delta >= 10) {
      const signalsBefore = sequence
        .slice(0, Math.min(3, sequence.length))
        .map(
          (s) =>
            `[${s.category}] ${s.headline} (score: ${s.riskScore})`
        );

      patterns.push({
        countryCode: countryCode.toUpperCase(),
        sequence: sequence.map((s) => ({
          id: s.id,
          headline: s.headline,
          category: s.category,
          riskScore: s.riskScore,
          createdAt: s.createdAt,
        })),
        escalationDelta: delta,
        signalsBefore,
      });
    }
  }

  // Sort by escalation delta descending
  patterns.sort((a, b) => b.escalationDelta - a.escalationDelta);
  return patterns;
}

// ---- 7. Get Reasoning Stats ----

export async function getReasoningStats(
  userId: string
): Promise<ReasoningStats> {
  // Total reasoning calls
  const totalCalls = await db.reasoningHistory.count({
    where: { userId },
  });

  // Category breakdown
  const categoryGroups = await db.reasoningHistory.groupBy({
    by: ["category"],
    where: { userId },
    _count: { id: true },
  });

  const byCategory: Record<string, number> = {};
  for (const g of categoryGroups) {
    byCategory[g.category] = g._count.id;
  }

  // Average risk score from classification JSON
  const allEntries = await db.reasoningHistory.findMany({
    where: { userId },
    select: { classification: true },
  });

  let totalRisk = 0;
  let riskCount = 0;
  for (const e of allEntries) {
    const cls = e.classification as Record<string, unknown> | null;
    if (typeof cls?.riskScore === "number") {
      totalRisk += cls.riskScore;
      riskCount++;
    }
  }
  const avgRiskScore = riskCount > 0 ? totalRisk / riskCount : 0;

  // Forecast accuracy summary
  const forecastAccuracy = await getForecastAccuracy(userId);

  // Top 5 most analyzed countries
  const countryGroups = await db.reasoningHistory.groupBy({
    by: ["countryCode"],
    where: { userId, countryCode: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });

  const topCountries = countryGroups.map((g) => ({
    countryCode: g.countryCode ?? "UNKNOWN",
    count: g._count.id,
  }));

  return {
    totalCalls,
    byCategory,
    avgRiskScore: Math.round(avgRiskScore * 10) / 10,
    forecastAccuracy,
    topCountries,
  };
}
