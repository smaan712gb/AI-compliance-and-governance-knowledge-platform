import { db } from "@/lib/db";
import { WelfordAccumulator } from "./anomaly-detection";

// ============================================
// CCM — Adaptive Baseline Learning
// Learns normal patterns from historical data
// Adjusts thresholds automatically over time
// ============================================

export interface BaselineMetric {
  field: string;
  domain: string;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  p5: number;
  p95: number;
  sampleSize: number;
  lastUpdated: Date;
  trend: "INCREASING" | "DECREASING" | "STABLE";
  trendSlope: number;
  seasonalPattern?: {
    hourOfDay: number[];
    dayOfWeek: number[];
    dayOfMonth: number[];
  };
}

export interface BaselineStore {
  organizationId: string;
  metrics: BaselineMetric[];
  lastComputed: Date;
  version: number;
}

// In-memory baseline cache
const baselineCache = new Map<string, BaselineStore>();

// ---- Helpers ----

function sortedCopy(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance =
    values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function classifyTrend(
  slope: number,
  stddev: number
): "INCREASING" | "DECREASING" | "STABLE" {
  const threshold = stddev > 0 ? stddev * 0.05 : Math.abs(slope) * 0.1;
  if (slope > threshold) return "INCREASING";
  if (slope < -threshold) return "DECREASING";
  return "STABLE";
}

// ---- Core Functions ----

/** Compute baselines from historical data */
export async function computeBaselines(
  organizationId: string,
  options: { domains?: string[]; lookbackDays?: number } = {}
): Promise<BaselineStore> {
  const lookbackDays = options.lookbackDays ?? 90;
  const since = new Date(Date.now() - lookbackDays * 86_400_000);

  const connectors = await db.eRPConnector.findMany({
    where: { organizationId, isActive: true },
    select: { id: true },
  });
  const connectorIds = connectors.map((c) => c.id);

  if (connectorIds.length === 0) {
    const empty: BaselineStore = {
      organizationId,
      metrics: [],
      lastComputed: new Date(),
      version: 1,
    };
    baselineCache.set(organizationId, empty);
    return empty;
  }

  const whereClause: Record<string, unknown> = {
    connectorId: { in: connectorIds },
    pulledAt: { gte: since },
  };
  if (options.domains && options.domains.length > 0) {
    whereClause.domain = { in: options.domains };
  }

  const dataPoints = await db.eRPDataPoint.findMany({
    where: whereClause,
    orderBy: { pulledAt: "asc" },
    take: 50000,
  });

  // Group numeric values by (domain, field)
  const fieldGroups = new Map<
    string,
    {
      domain: string;
      field: string;
      values: number[];
      timestamps: Date[];
    }
  >();

  for (const dp of dataPoints) {
    const data = dp.data as Record<string, unknown>;
    if (!data || typeof data !== "object") continue;
    for (const [key, val] of Object.entries(data)) {
      if (typeof val === "number" && isFinite(val)) {
        const groupKey = `${dp.domain}::${key}`;
        let group = fieldGroups.get(groupKey);
        if (!group) {
          group = { domain: dp.domain, field: key, values: [], timestamps: [] };
          fieldGroups.set(groupKey, group);
        }
        group.values.push(val);
        group.timestamps.push(dp.pulledAt);
      }
    }
  }

  const metrics: BaselineMetric[] = [];

  for (const group of fieldGroups.values()) {
    if (group.values.length < 5) continue;

    const sorted = sortedCopy(group.values);
    const m = mean(group.values);
    const sd = stdDev(group.values);
    const regression = linearRegression(group.values);
    const trend = classifyTrend(regression.slope, sd);

    // Seasonal patterns
    const hourOfDay = new Array(24).fill(0) as number[];
    const dayOfWeek = new Array(7).fill(0) as number[];
    const dayOfMonth = new Array(31).fill(0) as number[];
    const hourCounts = new Array(24).fill(0) as number[];
    const dowCounts = new Array(7).fill(0) as number[];
    const domCounts = new Array(31).fill(0) as number[];

    for (let i = 0; i < group.timestamps.length; i++) {
      const ts = group.timestamps[i];
      const h = ts.getUTCHours();
      const dow = ts.getUTCDay();
      const dom = ts.getUTCDate() - 1;
      hourOfDay[h] += group.values[i];
      hourCounts[h]++;
      dayOfWeek[dow] += group.values[i];
      dowCounts[dow]++;
      dayOfMonth[dom] += group.values[i];
      domCounts[dom]++;
    }

    // Average per bucket
    for (let i = 0; i < 24; i++) {
      hourOfDay[i] = hourCounts[i] > 0 ? hourOfDay[i] / hourCounts[i] : 0;
    }
    for (let i = 0; i < 7; i++) {
      dayOfWeek[i] = dowCounts[i] > 0 ? dayOfWeek[i] / dowCounts[i] : 0;
    }
    for (let i = 0; i < 31; i++) {
      dayOfMonth[i] = domCounts[i] > 0 ? dayOfMonth[i] / domCounts[i] : 0;
    }

    metrics.push({
      field: group.field,
      domain: group.domain,
      mean: m,
      stdDev: sd,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p5: percentile(sorted, 5),
      p95: percentile(sorted, 95),
      sampleSize: group.values.length,
      lastUpdated: new Date(),
      trend,
      trendSlope: regression.slope,
      seasonalPattern: { hourOfDay, dayOfWeek, dayOfMonth },
    });
  }

  const existing = baselineCache.get(organizationId);
  const store: BaselineStore = {
    organizationId,
    metrics,
    lastComputed: new Date(),
    version: (existing?.version ?? 0) + 1,
  };

  baselineCache.set(organizationId, store);

  // Persist baseline summary to audit log for survivability across restarts
  try {
    await db.cCMAuditLog.create({
      data: {
        organizationId,
        userId: "system",
        action: "RUN_AI_ANALYSIS",
        resourceType: "baseline",
        resourceId: `baseline-v${store.version}`,
        details: {
          type: "adaptive_baseline",
          version: store.version,
          metricsCount: metrics.length,
          lookbackDays,
          computedAt: store.lastComputed.toISOString(),
          metricsSummary: metrics.map((m) => ({
            field: m.field,
            domain: m.domain,
            mean: m.mean,
            stdDev: m.stdDev,
            sampleSize: m.sampleSize,
            trend: m.trend,
          })),
        },
      },
    });
  } catch {
    console.error("[AdaptiveBaselines] Failed to persist baseline to audit log");
  }

  return store;
}

/** Get current baselines for an org (from cache or compute fresh) */
export async function getBaselines(
  organizationId: string
): Promise<BaselineStore> {
  const cached = baselineCache.get(organizationId);
  if (cached) {
    // Refresh if older than 6 hours
    const ageMs = Date.now() - cached.lastComputed.getTime();
    if (ageMs < 6 * 3600_000) return cached;
  }
  return computeBaselines(organizationId);
}

/** Update baselines incrementally with new data (Welford's algorithm) */
export async function updateBaselinesIncremental(
  organizationId: string,
  newDataPoints: {
    domain: string;
    dataType: string;
    data: Record<string, unknown>;
  }[]
): Promise<void> {
  let store = baselineCache.get(organizationId);
  if (!store) {
    store = await computeBaselines(organizationId);
    return; // Fresh compute already includes all data
  }

  const metricMap = new Map<string, BaselineMetric>();
  for (const m of store.metrics) {
    metricMap.set(`${m.domain}::${m.field}`, m);
  }

  // Track Welford accumulators for new fields
  const accumulators = new Map<string, WelfordAccumulator>();

  for (const dp of newDataPoints) {
    if (!dp.data || typeof dp.data !== "object") continue;
    for (const [key, val] of Object.entries(dp.data)) {
      if (typeof val !== "number" || !isFinite(val)) continue;
      const metricKey = `${dp.domain}::${key}`;
      const existing = metricMap.get(metricKey);

      if (existing) {
        // Incremental update using Welford's
        const oldN = existing.sampleSize;
        const newN = oldN + 1;
        const oldMean = existing.mean;
        const newMean = oldMean + (val - oldMean) / newN;

        // Update variance estimate: M2_new = M2_old + (val - oldMean)(val - newMean)
        const oldVariance = existing.stdDev ** 2;
        const oldM2 = oldVariance * (oldN - 1);
        const newM2 = oldM2 + (val - oldMean) * (val - newMean);
        const newStdDev = newN > 1 ? Math.sqrt(newM2 / (newN - 1)) : 0;

        existing.mean = newMean;
        existing.stdDev = newStdDev;
        existing.sampleSize = newN;
        existing.min = Math.min(existing.min, val);
        existing.max = Math.max(existing.max, val);
        existing.lastUpdated = new Date();
        // Trend re-evaluation: if value is above mean, nudge slope up
        const deviation = val - oldMean;
        existing.trendSlope =
          existing.trendSlope * 0.95 + (deviation / (existing.stdDev || 1)) * 0.05;
        existing.trend = classifyTrend(existing.trendSlope, existing.stdDev);
      } else {
        // New field — start accumulator
        let acc = accumulators.get(metricKey);
        if (!acc) {
          acc = new WelfordAccumulator();
          accumulators.set(metricKey, acc);
        }
        acc.add(val);
      }
    }
  }

  // Convert new accumulators to metrics
  for (const [metricKey, acc] of accumulators.entries()) {
    if (acc.getCount() < 3) continue;
    const [domain, field] = metricKey.split("::");
    const newMetric: BaselineMetric = {
      field,
      domain,
      mean: acc.getMean(),
      stdDev: acc.getStdDev(),
      min: acc.getMean() - acc.getStdDev() * 2,
      max: acc.getMean() + acc.getStdDev() * 2,
      p5: acc.getMean() - acc.getStdDev() * 1.645,
      p95: acc.getMean() + acc.getStdDev() * 1.645,
      sampleSize: acc.getCount(),
      lastUpdated: new Date(),
      trend: "STABLE",
      trendSlope: 0,
    };
    store.metrics.push(newMetric);
    metricMap.set(metricKey, newMetric);
  }

  store.version++;
  store.lastComputed = new Date();
  baselineCache.set(organizationId, store);
}

/** Check if a value is anomalous against the baseline */
export function checkAgainstBaseline(
  value: number,
  metric: BaselineMetric,
  sensitivity = 2.5
): {
  isAnomaly: boolean;
  deviation: number;
  direction: "above" | "below" | "normal";
  confidence: number;
} {
  if (metric.stdDev === 0) {
    const isExact = value === metric.mean;
    return {
      isAnomaly: !isExact,
      deviation: isExact ? 0 : Infinity,
      direction: isExact ? "normal" : value > metric.mean ? "above" : "below",
      confidence: isExact ? 100 : 50,
    };
  }

  const zScore = Math.abs((value - metric.mean) / metric.stdDev);
  const isAnomaly = zScore > sensitivity;
  const direction: "above" | "below" | "normal" =
    value > metric.mean + sensitivity * metric.stdDev
      ? "above"
      : value < metric.mean - sensitivity * metric.stdDev
        ? "below"
        : "normal";

  // Confidence based on sample size and z-score
  const sampleConfidence = Math.min(1, metric.sampleSize / 30);
  const zConfidence = isAnomaly ? Math.min(1, (zScore - sensitivity) / 2 + 0.5) : 1 - zScore / sensitivity;
  const confidence = Math.round(sampleConfidence * zConfidence * 100);

  return { isAnomaly, deviation: zScore, direction, confidence };
}

/** Detect trend changes (regime shifts) using CUSUM-inspired approach */
export function detectTrendChange(
  values: number[],
  windowSize = 20
): {
  hasChanged: boolean;
  changePoint: number | null;
  previousMean: number;
  currentMean: number;
  significance: number;
} {
  if (values.length < windowSize * 2) {
    return {
      hasChanged: false,
      changePoint: null,
      previousMean: mean(values),
      currentMean: mean(values),
      significance: 0,
    };
  }

  // Sliding window: find the point of maximum mean difference
  let maxDiff = 0;
  let bestChangePoint = -1;
  let bestPrevMean = 0;
  let bestCurrMean = 0;

  for (let i = windowSize; i <= values.length - windowSize; i++) {
    const prevWindow = values.slice(i - windowSize, i);
    const currWindow = values.slice(i, i + windowSize);
    const prevMean = mean(prevWindow);
    const currMean = mean(currWindow);
    const diff = Math.abs(currMean - prevMean);

    if (diff > maxDiff) {
      maxDiff = diff;
      bestChangePoint = i;
      bestPrevMean = prevMean;
      bestCurrMean = currMean;
    }
  }

  // Significance: compare the max difference to overall std dev
  const overallStd = stdDev(values);
  const significance =
    overallStd > 0 ? Math.min(100, Math.round((maxDiff / overallStd) * 50)) : 0;

  return {
    hasChanged: significance > 60,
    changePoint: significance > 60 ? bestChangePoint : null,
    previousMean: bestPrevMean,
    currentMean: bestCurrMean,
    significance,
  };
}

/** Seasonal decomposition (simple additive model using moving averages) */
export function decomposeTimeSeries(
  values: { timestamp: Date; value: number }[],
  period: "hourly" | "daily" | "weekly"
): {
  trend: number[];
  seasonal: number[];
  residual: number[];
} {
  if (values.length === 0) {
    return { trend: [], seasonal: [], residual: [] };
  }

  // Sort by timestamp
  const sorted = [...values].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
  const raw = sorted.map((v) => v.value);
  const n = raw.length;

  // Determine period length in data points
  let periodLen: number;
  if (n < 3) {
    return { trend: [...raw], seasonal: new Array(n).fill(0), residual: new Array(n).fill(0) };
  }

  switch (period) {
    case "hourly":
      periodLen = 24;
      break;
    case "daily":
      periodLen = 7;
      break;
    case "weekly":
      periodLen = 4;
      break;
  }

  // If not enough data for at least 2 periods, return raw as trend
  if (n < periodLen * 2) {
    return {
      trend: [...raw],
      seasonal: new Array(n).fill(0),
      residual: new Array(n).fill(0),
    };
  }

  // Step 1: Compute trend via centered moving average
  const halfWindow = Math.floor(periodLen / 2);
  const trendArr = new Array(n).fill(NaN) as number[];

  for (let i = halfWindow; i < n - halfWindow; i++) {
    let sum = 0;
    for (let j = i - halfWindow; j <= i + halfWindow; j++) {
      sum += raw[j];
    }
    trendArr[i] = sum / (2 * halfWindow + 1);
  }

  // Fill edges with nearest computed value
  for (let i = 0; i < halfWindow; i++) {
    trendArr[i] = trendArr[halfWindow];
  }
  for (let i = n - halfWindow; i < n; i++) {
    trendArr[i] = trendArr[n - halfWindow - 1];
  }

  // Step 2: Detrend and compute seasonal averages
  const detrended = raw.map((v, i) => v - trendArr[i]);
  const seasonalBuckets = new Array(periodLen).fill(0) as number[];
  const seasonalCounts = new Array(periodLen).fill(0) as number[];

  for (let i = 0; i < n; i++) {
    const bucket = i % periodLen;
    seasonalBuckets[bucket] += detrended[i];
    seasonalCounts[bucket]++;
  }

  const seasonalAvg = seasonalBuckets.map((sum, idx) =>
    seasonalCounts[idx] > 0 ? sum / seasonalCounts[idx] : 0
  );

  // Center seasonal component (subtract its mean)
  const seasonalMean = mean(seasonalAvg);
  const centeredSeasonal = seasonalAvg.map((v) => v - seasonalMean);

  // Step 3: Build seasonal and residual arrays
  const seasonal = new Array(n).fill(0) as number[];
  const residual = new Array(n).fill(0) as number[];

  for (let i = 0; i < n; i++) {
    seasonal[i] = centeredSeasonal[i % periodLen];
    residual[i] = raw[i] - trendArr[i] - seasonal[i];
  }

  return { trend: trendArr, seasonal, residual };
}
