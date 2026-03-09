// ============================================
// SENTINEL — Data Freshness Tracker
// Monitors source health and reports intelligence gaps
// ============================================

import { ALL_RSS_SOURCES, type RSSSource, type SourceCategory } from "./rss-sources";

export type FreshnessStatus = "fresh" | "stale" | "very_stale" | "no_data" | "error" | "disabled";

export interface SourceFreshness {
  sourceId: string;
  sourceName: string;
  category: SourceCategory;
  status: FreshnessStatus;
  lastFetchAt: Date | null;
  lastSuccessAt: Date | null;
  itemCount: number;
  ageMinutes: number;
  error?: string;
}

export interface FreshnessReport {
  timestamp: string;
  totalSources: number;
  activeSources: number;
  statusBreakdown: Record<FreshnessStatus, number>;
  freshPercentage: number;
  intelligenceGaps: IntelligenceGap[];
  categoryHealth: Record<string, CategoryHealth>;
  requiredSourcesHealthy: boolean;
}

export interface IntelligenceGap {
  category: SourceCategory;
  region: string;
  missingSources: string[];
  lastDataAge: string;
  severity: "critical" | "warning" | "info";
}

export interface CategoryHealth {
  totalSources: number;
  freshSources: number;
  healthPercentage: number;
  oldestDataMinutes: number;
}

// Sources critical for risk scoring — must always be fresh
const REQUIRED_SOURCES = new Set([
  "reuters-world",
  "bbc-world",
  "usgs-quakes",
  "gdacs",
  "cisa-alerts",
]);

// Freshness thresholds (minutes)
const FRESH_THRESHOLD = 15;
const STALE_THRESHOLD = 120; // 2 hours
const VERY_STALE_THRESHOLD = 360; // 6 hours

// In-memory state
const sourceState = new Map<
  string,
  {
    lastFetchAt: Date | null;
    lastSuccessAt: Date | null;
    itemCount: number;
    error?: string;
  }
>();

export function updateSourceState(
  sourceId: string,
  success: boolean,
  itemCount: number,
  error?: string
): void {
  const now = new Date();
  const existing = sourceState.get(sourceId) || {
    lastFetchAt: null,
    lastSuccessAt: null,
    itemCount: 0,
  };

  existing.lastFetchAt = now;
  if (success) {
    existing.lastSuccessAt = now;
    existing.itemCount += itemCount;
    existing.error = undefined;
  } else {
    existing.error = error;
  }

  sourceState.set(sourceId, existing);
}

export function getSourceFreshness(source: RSSSource): SourceFreshness {
  if (!source.isActive) {
    return {
      sourceId: source.id,
      sourceName: source.name,
      category: source.category,
      status: "disabled",
      lastFetchAt: null,
      lastSuccessAt: null,
      itemCount: 0,
      ageMinutes: 0,
    };
  }

  const state = sourceState.get(source.id);

  if (!state || !state.lastSuccessAt) {
    return {
      sourceId: source.id,
      sourceName: source.name,
      category: source.category,
      status: "no_data",
      lastFetchAt: state?.lastFetchAt || null,
      lastSuccessAt: null,
      itemCount: 0,
      ageMinutes: Infinity,
      error: state?.error,
    };
  }

  const ageMinutes = (Date.now() - state.lastSuccessAt.getTime()) / 60000;

  let status: FreshnessStatus;
  if (state.error) {
    status = "error";
  } else if (ageMinutes <= FRESH_THRESHOLD) {
    status = "fresh";
  } else if (ageMinutes <= STALE_THRESHOLD) {
    status = "stale";
  } else {
    status = "very_stale";
  }

  return {
    sourceId: source.id,
    sourceName: source.name,
    category: source.category,
    status,
    lastFetchAt: state.lastFetchAt,
    lastSuccessAt: state.lastSuccessAt,
    itemCount: state.itemCount,
    ageMinutes: Math.round(ageMinutes),
    error: state.error,
  };
}

export function generateFreshnessReport(): FreshnessReport {
  const allFreshness = ALL_RSS_SOURCES.map(getSourceFreshness);
  const activeFreshness = allFreshness.filter((f) => f.status !== "disabled");

  // Status breakdown
  const statusBreakdown: Record<FreshnessStatus, number> = {
    fresh: 0,
    stale: 0,
    very_stale: 0,
    no_data: 0,
    error: 0,
    disabled: 0,
  };
  for (const f of allFreshness) {
    statusBreakdown[f.status]++;
  }

  // Fresh percentage
  const freshPercentage =
    activeFreshness.length > 0
      ? Math.round((statusBreakdown.fresh / activeFreshness.length) * 100)
      : 0;

  // Category health
  const categoryHealth: Record<string, CategoryHealth> = {};
  const categoryMap = new Map<string, SourceFreshness[]>();

  for (const f of activeFreshness) {
    const cat = f.category;
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(f);
  }

  for (const [cat, sources] of categoryMap) {
    const freshCount = sources.filter((s) => s.status === "fresh").length;
    const oldestAge = Math.max(...sources.map((s) => s.ageMinutes));

    categoryHealth[cat] = {
      totalSources: sources.length,
      freshSources: freshCount,
      healthPercentage: Math.round((freshCount / sources.length) * 100),
      oldestDataMinutes: isFinite(oldestAge) ? oldestAge : -1,
    };
  }

  // Intelligence gaps
  const intelligenceGaps: IntelligenceGap[] = [];

  for (const [cat, health] of Object.entries(categoryHealth)) {
    if (health.healthPercentage < 50) {
      const staleSources = categoryMap
        .get(cat)
        ?.filter((s) => s.status !== "fresh")
        .map((s) => s.sourceName) || [];

      intelligenceGaps.push({
        category: cat as SourceCategory,
        region: "global",
        missingSources: staleSources,
        lastDataAge: formatAge(health.oldestDataMinutes),
        severity:
          health.healthPercentage === 0
            ? "critical"
            : health.healthPercentage < 25
            ? "warning"
            : "info",
      });
    }
  }

  // Required sources check
  const requiredSourcesHealthy = [...REQUIRED_SOURCES].every((id) => {
    const source = ALL_RSS_SOURCES.find((s) => s.id === id);
    if (!source) return false;
    const freshness = getSourceFreshness(source);
    return freshness.status === "fresh" || freshness.status === "stale";
  });

  return {
    timestamp: new Date().toISOString(),
    totalSources: ALL_RSS_SOURCES.length,
    activeSources: activeFreshness.length,
    statusBreakdown,
    freshPercentage,
    intelligenceGaps,
    categoryHealth,
    requiredSourcesHealthy,
  };
}

function formatAge(minutes: number): string {
  if (minutes < 0) return "no data";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

// Reset for testing
export function resetFreshnessState(): void {
  sourceState.clear();
}
