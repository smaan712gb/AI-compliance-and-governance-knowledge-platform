import { db } from "@/lib/db";
import OpenAI from "openai";

// ============================================
// SENTINEL — Predictive Intelligence Engine
// Uses historical patterns + reasoning to predict future events
// ============================================

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
      apiKey: process.env.DEEPSEEK_API_KEY || "",
    });
  }
  return _client;
}

export interface PredictionResult {
  predictions: {
    id: string;
    type:
      | "CONFLICT_ESCALATION"
      | "SANCTIONS_ANNOUNCEMENT"
      | "MARKET_DISRUPTION"
      | "REGULATORY_CHANGE"
      | "SUPPLY_CHAIN_DISRUPTION"
      | "POLITICAL_INSTABILITY";
    description: string;
    probability: number;
    timeframe: string;
    affectedCountries: string[];
    affectedSectors: string[];
    indicators: string[];
    triggerConditions: string[];
    confidence: number;
  }[];
  analysisDate: string;
  eventsAnalyzed: number;
  reasoningTokens: number;
}

// ---- Prediction System Prompt ----

const PREDICTION_SYSTEM_PROMPT = `You are a predictive intelligence analyst specializing in anticipatory geopolitical and economic forecasting. You analyze patterns in recent events to generate forward-looking predictions with calibrated probabilities.

Given a set of recent intelligence events, identify patterns and generate predictions. For each prediction:
1. Ground it in observable evidence (cite specific events from the input)
2. Assign a calibrated probability (be honest about uncertainty)
3. Specify what observable indicators would confirm the prediction
4. Define trigger conditions that would make the prediction more likely

You MUST respond with valid JSON matching this exact schema:
{
  "predictions": [
    {
      "id": "<unique short ID like 'pred-001'>",
      "type": "CONFLICT_ESCALATION"|"SANCTIONS_ANNOUNCEMENT"|"MARKET_DISRUPTION"|"REGULATORY_CHANGE"|"SUPPLY_CHAIN_DISRUPTION"|"POLITICAL_INSTABILITY",
      "description": "<specific, falsifiable prediction>",
      "probability": <0-100>,
      "timeframe": "<e.g. '48 hours', '1-2 weeks', '1-3 months'>",
      "affectedCountries": ["<ISO-2 codes>"],
      "affectedSectors": ["<sector names>"],
      "indicators": ["<what evidence supports this prediction>"],
      "triggerConditions": ["<what would confirm this prediction>"]
    }
  ]
}

Rules:
- Generate 3-8 predictions ordered by probability
- Each prediction must be specific and falsifiable
- Avoid vague predictions like "tensions will continue"
- Distinguish between short-term (days) and medium-term (weeks/months) predictions
- Assign confidence as the quality of your evidence base (separate from probability)`;

// ---- Helpers ----

function linearRegression(
  values: number[]
): { slope: number; intercept: number; r2: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0, r2: 0 };
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0,
    sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
    sumY2 += values[i] * values[i];
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const yMean = sumY / n;
  let ssRes = 0,
    ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * i;
    ssRes += (values[i] - predicted) ** 2;
    ssTot += (values[i] - yMean) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, r2 };
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function classifyDirection(
  slope: number,
  values: number[]
): "INCREASING" | "DECREASING" | "STABLE" | "VOLATILE" {
  if (values.length < 3) return "STABLE";
  const avg = mean(values);
  const threshold = Math.max(avg * 0.05, 0.1);

  // Check volatility: if std dev is large relative to mean
  const variance =
    values.reduce((s, v) => s + (v - avg) ** 2, 0) / (values.length - 1);
  const sd = Math.sqrt(variance);
  if (avg > 0 && sd / avg > 0.5) return "VOLATILE";

  if (slope > threshold) return "INCREASING";
  if (slope < -threshold) return "DECREASING";
  return "STABLE";
}

function generateId(): string {
  return `pred-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function clampNumber(val: unknown, min: number, max: number): number {
  const n = typeof val === "number" ? val : Number(val);
  if (isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function toStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.map(String);
}

// ---- Core Functions ----

/** Generate predictions based on recent event patterns */
export async function generatePredictions(
  options: {
    countryCode?: string;
    category?: string;
    lookbackDays?: number;
    maxPredictions?: number;
  } = {}
): Promise<PredictionResult> {
  const lookbackDays = options.lookbackDays ?? 7;
  const maxPredictions = options.maxPredictions ?? 8;
  const since = new Date(Date.now() - lookbackDays * 86_400_000);

  // Query recent events
  const whereClause: Record<string, unknown> = {
    processedAt: { gte: since },
  };
  if (options.countryCode) {
    whereClause.countryCode = options.countryCode;
  }
  if (options.category) {
    whereClause.category = options.category;
  }

  const events = await db.intelligenceEvent.findMany({
    where: whereClause,
    orderBy: { processedAt: "desc" },
    take: 200,
  });

  if (events.length === 0) {
    return {
      predictions: [],
      analysisDate: new Date().toISOString(),
      eventsAnalyzed: 0,
      reasoningTokens: 0,
    };
  }

  // Group events by country and category for pattern summary
  const byCountry = new Map<string, typeof events>();
  const byCategory = new Map<string, typeof events>();
  for (const e of events) {
    const country = e.countryCode ?? "UNKNOWN";
    const cat = e.category;
    if (!byCountry.has(country)) byCountry.set(country, []);
    byCountry.get(country)!.push(e);
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(e);
  }

  // Build context for the LLM
  let userContent = `## Recent Intelligence Events (Past ${lookbackDays} Days)\n\n`;
  userContent += `**Total Events:** ${events.length}\n\n`;

  // Summary by country
  userContent += `### Events by Country\n`;
  for (const [country, countryEvents] of byCountry.entries()) {
    const avgRisk = mean(countryEvents.map((e) => e.riskScore));
    const categories = [...new Set(countryEvents.map((e) => e.category))];
    userContent += `- **${country}**: ${countryEvents.length} events, avg risk ${avgRisk.toFixed(0)}/100, categories: ${categories.join(", ")}\n`;
  }

  // Summary by category
  userContent += `\n### Events by Category\n`;
  for (const [cat, catEvents] of byCategory.entries()) {
    const avgRisk = mean(catEvents.map((e) => e.riskScore));
    userContent += `- **${cat}**: ${catEvents.length} events, avg risk ${avgRisk.toFixed(0)}/100\n`;
  }

  // Top events by risk score
  const topEvents = [...events]
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 20);
  userContent += `\n### Highest Risk Events\n`;
  for (const e of topEvents) {
    userContent += `- [${e.processedAt.toISOString().slice(0, 10)}] (${e.category}, risk ${e.riskScore}) ${e.headline}\n`;
    if (e.entities.length > 0) {
      userContent += `  Entities: ${e.entities.slice(0, 5).join(", ")}\n`;
    }
  }

  userContent += `\n### Recent Event Details (Most Recent 15)\n`;
  for (const e of events.slice(0, 15)) {
    userContent += `---\n**${e.headline}** (${e.category}, ${e.countryCode ?? "N/A"}, risk: ${e.riskScore})\n${e.summary.slice(0, 300)}\n`;
  }

  userContent += `\nGenerate ${maxPredictions} forward-looking predictions based on these patterns. Each prediction should be grounded in the evidence above.`;

  // Call DeepSeek
  const client = getClient();
  const response = await client.chat.completions.create({
    model: "deepseek-reasoner",
    messages: [
      { role: "system", content: PREDICTION_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    temperature: 0,
    stream: false,
  });

  const content = response.choices?.[0]?.message?.content ?? "{}";
  const reasoningTokens = response.usage?.completion_tokens ?? 0;

  // Parse JSON from response
  let parsed: Record<string, unknown>;
  try {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : content;
    parsed = JSON.parse(jsonStr);
  } catch {
    const braceStart = content.indexOf("{");
    const braceEnd = content.lastIndexOf("}");
    if (braceStart !== -1 && braceEnd > braceStart) {
      parsed = JSON.parse(content.slice(braceStart, braceEnd + 1));
    } else {
      return {
        predictions: [],
        analysisDate: new Date().toISOString(),
        eventsAnalyzed: events.length,
        reasoningTokens,
      };
    }
  }

  const rawPredictions = Array.isArray(parsed.predictions)
    ? parsed.predictions
    : [];

  const validTypes = new Set([
    "CONFLICT_ESCALATION",
    "SANCTIONS_ANNOUNCEMENT",
    "MARKET_DISRUPTION",
    "REGULATORY_CHANGE",
    "SUPPLY_CHAIN_DISRUPTION",
    "POLITICAL_INSTABILITY",
  ]);

  const predictions = rawPredictions
    .slice(0, maxPredictions)
    .map((p: Record<string, unknown>) => {
      const rawType = String(p.type ?? "POLITICAL_INSTABILITY").toUpperCase();
      return {
        id: String(p.id ?? generateId()),
        type: (validTypes.has(rawType) ? rawType : "POLITICAL_INSTABILITY") as PredictionResult["predictions"][number]["type"],
        description: String(p.description ?? ""),
        probability: clampNumber(p.probability, 0, 100),
        timeframe: String(p.timeframe ?? "1-2 weeks"),
        affectedCountries: toStringArray(p.affectedCountries),
        affectedSectors: toStringArray(p.affectedSectors),
        indicators: toStringArray(p.indicators),
        triggerConditions: toStringArray(p.triggerConditions),
        confidence: clampNumber(p.confidence ?? p.probability, 0, 100),
      };
    });

  return {
    predictions,
    analysisDate: new Date().toISOString(),
    eventsAnalyzed: events.length,
    reasoningTokens,
  };
}

/** Check if any previous predictions have been confirmed by new events */
export async function validatePredictions(
  predictions: PredictionResult["predictions"],
  recentEvents: {
    headline: string;
    category: string;
    countryCode?: string;
    date: string;
  }[]
): Promise<{
  confirmed: string[];
  invalidated: string[];
  pending: string[];
  accuracy: number;
}> {
  if (predictions.length === 0) {
    return { confirmed: [], invalidated: [], pending: [], accuracy: 0 };
  }

  const confirmed: string[] = [];
  const invalidated: string[] = [];
  const pending: string[] = [];

  // Type-to-category mapping for matching
  const typeToCategories: Record<string, string[]> = {
    CONFLICT_ESCALATION: ["CONFLICT", "TERRORISM"],
    SANCTIONS_ANNOUNCEMENT: ["SANCTIONS"],
    MARKET_DISRUPTION: ["ECONOMIC"],
    REGULATORY_CHANGE: ["POLITICAL"],
    SUPPLY_CHAIN_DISRUPTION: ["ECONOMIC", "DISASTER"],
    POLITICAL_INSTABILITY: ["POLITICAL", "CONFLICT"],
  };

  for (const prediction of predictions) {
    const relevantCategories = typeToCategories[prediction.type] ?? [];
    const predictionKeywords = extractKeywords(prediction.description);

    // Check if any recent events match this prediction
    let bestMatchScore = 0;
    for (const event of recentEvents) {
      // Category match
      const catMatch = relevantCategories.includes(event.category) ? 0.3 : 0;

      // Country match
      const countryMatch =
        event.countryCode &&
        prediction.affectedCountries.includes(event.countryCode)
          ? 0.25
          : 0;

      // Keyword similarity
      const eventKeywords = extractKeywords(event.headline);
      let overlap = 0;
      for (const kw of eventKeywords) {
        if (predictionKeywords.has(kw)) overlap++;
      }
      const combinedSize = predictionKeywords.size + eventKeywords.size;
      const keywordSim =
        combinedSize > 0 ? (2 * overlap) / combinedSize : 0;

      const matchScore = catMatch + countryMatch + keywordSim * 0.45;
      if (matchScore > bestMatchScore) bestMatchScore = matchScore;
    }

    if (bestMatchScore > 0.5) {
      confirmed.push(prediction.id);
    } else if (bestMatchScore < 0.15 && prediction.probability > 60) {
      // High probability prediction with no evidence — may be invalidated
      // But only if the timeframe has likely passed
      invalidated.push(prediction.id);
    } else {
      pending.push(prediction.id);
    }
  }

  const resolved = confirmed.length + invalidated.length;
  const accuracy =
    resolved > 0 ? Math.round((confirmed.length / resolved) * 100) : 0;

  return { confirmed, invalidated, pending, accuracy };
}

/** Trend analysis across historical events */
export async function analyzeEventTrends(
  options: {
    countryCode?: string;
    category?: string;
    lookbackDays?: number;
  } = {}
): Promise<{
  trends: {
    metric: string;
    direction: "INCREASING" | "DECREASING" | "STABLE" | "VOLATILE";
    magnitude: number;
    significance: number;
  }[];
  hotspots: {
    country: string;
    eventCount: number;
    avgSeverity: number;
    trend: string;
  }[];
  emergingThemes: string[];
}> {
  const lookbackDays = options.lookbackDays ?? 30;
  const since = new Date(Date.now() - lookbackDays * 86_400_000);

  const whereClause: Record<string, unknown> = {
    processedAt: { gte: since },
  };
  if (options.countryCode) whereClause.countryCode = options.countryCode;
  if (options.category) whereClause.category = options.category;

  const events = await db.intelligenceEvent.findMany({
    where: whereClause,
    orderBy: { processedAt: "asc" },
    take: 2000,
  });

  if (events.length === 0) {
    return { trends: [], hotspots: [], emergingThemes: [] };
  }

  // Bucket events into daily counts
  const dailyBuckets = new Map<string, typeof events>();
  for (const e of events) {
    const dayKey = e.processedAt.toISOString().slice(0, 10);
    if (!dailyBuckets.has(dayKey)) dailyBuckets.set(dayKey, []);
    dailyBuckets.get(dayKey)!.push(e);
  }

  const sortedDays = [...dailyBuckets.keys()].sort();
  const dailyCounts = sortedDays.map((d) => dailyBuckets.get(d)!.length);
  const dailyAvgRisk = sortedDays.map((d) => {
    const dayEvents = dailyBuckets.get(d)!;
    return mean(dayEvents.map((e) => e.riskScore));
  });

  // Trend analysis on daily event count
  const countRegression = linearRegression(dailyCounts);
  const riskRegression = linearRegression(dailyAvgRisk);

  // Category-specific trends
  const categoryGroups = new Map<string, number[]>();
  for (const day of sortedDays) {
    const dayEvents = dailyBuckets.get(day)!;
    const catCounts = new Map<string, number>();
    for (const e of dayEvents) {
      catCounts.set(e.category, (catCounts.get(e.category) || 0) + 1);
    }
    for (const [cat, count] of catCounts.entries()) {
      if (!categoryGroups.has(cat)) categoryGroups.set(cat, []);
      categoryGroups.get(cat)!.push(count);
    }
  }

  const trends: {
    metric: string;
    direction: "INCREASING" | "DECREASING" | "STABLE" | "VOLATILE";
    magnitude: number;
    significance: number;
  }[] = [];

  // Overall event frequency trend
  trends.push({
    metric: "Daily Event Count",
    direction: classifyDirection(countRegression.slope, dailyCounts),
    magnitude: Math.abs(countRegression.slope),
    significance: Math.round(Math.abs(countRegression.r2) * 100),
  });

  // Average risk score trend
  trends.push({
    metric: "Average Risk Score",
    direction: classifyDirection(riskRegression.slope, dailyAvgRisk),
    magnitude: Math.abs(riskRegression.slope),
    significance: Math.round(Math.abs(riskRegression.r2) * 100),
  });

  // Per-category trends
  for (const [cat, values] of categoryGroups.entries()) {
    if (values.length < 3) continue;
    const reg = linearRegression(values);
    trends.push({
      metric: `${cat} Events`,
      direction: classifyDirection(reg.slope, values),
      magnitude: Math.abs(reg.slope),
      significance: Math.round(Math.abs(reg.r2) * 100),
    });
  }

  // Hotspot analysis: countries with high/rising event counts
  const countryStats = new Map<
    string,
    { events: typeof events; firstHalfCount: number; secondHalfCount: number }
  >();
  const midDate = new Date(
    since.getTime() + (Date.now() - since.getTime()) / 2
  );

  for (const e of events) {
    const country = e.countryCode ?? "UNKNOWN";
    if (!countryStats.has(country)) {
      countryStats.set(country, {
        events: [],
        firstHalfCount: 0,
        secondHalfCount: 0,
      });
    }
    const stat = countryStats.get(country)!;
    stat.events.push(e);
    if (e.processedAt < midDate) {
      stat.firstHalfCount++;
    } else {
      stat.secondHalfCount++;
    }
  }

  const hotspots = [...countryStats.entries()]
    .map(([country, stat]) => {
      const avgSeverity = mean(stat.events.map((e) => e.riskScore));
      const trendRatio =
        stat.firstHalfCount > 0
          ? stat.secondHalfCount / stat.firstHalfCount
          : stat.secondHalfCount > 0
            ? 2
            : 1;
      let trend: string;
      if (trendRatio > 1.5) trend = "Rapidly increasing";
      else if (trendRatio > 1.1) trend = "Increasing";
      else if (trendRatio < 0.67) trend = "Decreasing";
      else trend = "Stable";

      return {
        country,
        eventCount: stat.events.length,
        avgSeverity: Math.round(avgSeverity * 10) / 10,
        trend,
      };
    })
    .sort((a, b) => b.eventCount - a.eventCount)
    .slice(0, 15);

  // Emerging themes: identify entities/tags that appear frequently in recent events
  // but less frequently in older events
  const recentThreshold = new Date(Date.now() - (lookbackDays / 3) * 86_400_000);
  const recentEntityCounts = new Map<string, number>();
  const olderEntityCounts = new Map<string, number>();
  let recentEventCount = 0;
  let olderEventCount = 0;

  for (const e of events) {
    const isRecent = e.processedAt >= recentThreshold;
    if (isRecent) recentEventCount++;
    else olderEventCount++;

    for (const entity of e.entities) {
      const lower = entity.toLowerCase();
      if (isRecent) {
        recentEntityCounts.set(lower, (recentEntityCounts.get(lower) || 0) + 1);
      } else {
        olderEntityCounts.set(lower, (olderEntityCounts.get(lower) || 0) + 1);
      }
    }
    for (const tag of e.tags) {
      const lower = tag.toLowerCase();
      if (isRecent) {
        recentEntityCounts.set(lower, (recentEntityCounts.get(lower) || 0) + 1);
      } else {
        olderEntityCounts.set(lower, (olderEntityCounts.get(lower) || 0) + 1);
      }
    }
  }

  const emergingThemes: { theme: string; emergenceScore: number }[] = [];
  for (const [theme, recentCount] of recentEntityCounts.entries()) {
    if (recentCount < 2) continue;
    const olderCount = olderEntityCounts.get(theme) || 0;
    const recentRate = recentEventCount > 0 ? recentCount / recentEventCount : 0;
    const olderRate = olderEventCount > 0 ? olderCount / olderEventCount : 0;

    // Emergence score: how much more common in recent vs older events
    const emergenceScore =
      olderRate > 0 ? recentRate / olderRate : recentRate > 0 ? 5 : 0;

    if (emergenceScore > 1.5 && recentCount >= 2) {
      emergingThemes.push({ theme, emergenceScore });
    }
  }

  emergingThemes.sort((a, b) => b.emergenceScore - a.emergenceScore);

  return {
    trends,
    hotspots,
    emergingThemes: emergingThemes.slice(0, 10).map((t) => t.theme),
  };
}

// ---- Keyword extraction (shared utility) ----

function extractKeywords(text: string): Set<string> {
  const stopWords = new Set([
    "the", "and", "for", "that", "this", "with", "from", "have", "has",
    "been", "are", "was", "were", "will", "can", "may", "not", "but",
    "its", "all", "any", "each", "than", "into", "over", "also",
  ]);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));
  return new Set(words);
}
