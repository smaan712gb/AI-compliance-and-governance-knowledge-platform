import { db } from "@/lib/db";

// ============================================
// CCM — Statistical Anomaly Detection Engine
// Detects anomalies in ERP data using statistical methods
// No external ML libraries — pure TypeScript implementations
// ============================================

export interface AnomalyResult {
  dataPointId: string;
  anomalyType:
    | "Z_SCORE"
    | "IQR_OUTLIER"
    | "ISOLATION"
    | "FREQUENCY"
    | "TEMPORAL"
    | "BEHAVIORAL";
  score: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
  expectedRange: { min: number; max: number };
  actualValue: number;
  standardDeviationsFromMean: number;
  context: Record<string, unknown>;
}

export interface AnomalyDetectionResult {
  organizationId: string;
  dataPointsAnalyzed: number;
  anomaliesDetected: number;
  anomalies: AnomalyResult[];
  baselineStats: {
    field: string;
    mean: number;
    stdDev: number;
    median: number;
    q1: number;
    q3: number;
    sampleSize: number;
  }[];
}

// ---- Statistical Utilities ----

/** Welford's online algorithm for running mean/variance (O(1) space) */
export class WelfordAccumulator {
  private n = 0;
  private mean_ = 0;
  private m2 = 0;

  add(value: number): void {
    this.n++;
    const delta = value - this.mean_;
    this.mean_ += delta / this.n;
    const delta2 = value - this.mean_;
    this.m2 += delta * delta2;
  }

  getMean(): number {
    return this.n === 0 ? 0 : this.mean_;
  }

  getVariance(): number {
    return this.n < 2 ? 0 : this.m2 / (this.n - 1);
  }

  getStdDev(): number {
    return Math.sqrt(this.getVariance());
  }

  getCount(): number {
    return this.n;
  }
}

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

function scoreToSeverity(
  score: number
): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  if (score >= 90) return "CRITICAL";
  if (score >= 70) return "HIGH";
  if (score >= 50) return "MEDIUM";
  return "LOW";
}

// ---- Z-Score Anomaly Detection ----

export function detectZScoreAnomalies(
  values: number[],
  threshold = 2.5
): { index: number; value: number; zScore: number; isAnomaly: boolean }[] {
  const m = mean(values);
  const sd = stdDev(values);
  if (sd === 0) {
    return values.map((v, i) => ({
      index: i,
      value: v,
      zScore: 0,
      isAnomaly: false,
    }));
  }
  return values.map((v, i) => {
    const z = Math.abs((v - m) / sd);
    return { index: i, value: v, zScore: z, isAnomaly: z > threshold };
  });
}

// ---- IQR Outlier Detection ----

export function detectIQRAnomalies(
  values: number[],
  multiplier = 1.5
): {
  index: number;
  value: number;
  isAnomaly: boolean;
  bound: "upper" | "lower";
}[] {
  const sorted = sortedCopy(values);
  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;
  const lowerBound = q1 - multiplier * iqr;
  const upperBound = q3 + multiplier * iqr;

  return values.map((v, i) => ({
    index: i,
    value: v,
    isAnomaly: v < lowerBound || v > upperBound,
    bound: v < lowerBound ? "lower" : "upper",
  }));
}

// ---- Isolation Forest ----

interface IsolationTree {
  splitFeature: number;
  splitValue: number;
  left: IsolationTree | null;
  right: IsolationTree | null;
  size: number;
  depth: number;
}

/** Harmonic number approximation H(i) ~ ln(i) + 0.5772156649 */
function harmonicNumber(i: number): number {
  if (i <= 0) return 0;
  return Math.log(i) + 0.5772156649;
}

/** Average path length for normalization: c(n) = 2*H(n-1) - 2*(n-1)/n */
function averagePathLength(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  return 2 * harmonicNumber(n - 1) - (2 * (n - 1)) / n;
}

function buildIsolationTree(
  data: number[][],
  maxDepth: number,
  currentDepth: number
): IsolationTree {
  const size = data.length;

  if (currentDepth >= maxDepth || size <= 1) {
    return {
      splitFeature: -1,
      splitValue: 0,
      left: null,
      right: null,
      size,
      depth: currentDepth,
    };
  }

  const numFeatures = data[0].length;
  const splitFeature = Math.floor(Math.random() * numFeatures);

  let fMin = Infinity;
  let fMax = -Infinity;
  for (const row of data) {
    const v = row[splitFeature];
    if (v < fMin) fMin = v;
    if (v > fMax) fMax = v;
  }

  if (fMin === fMax) {
    return {
      splitFeature: -1,
      splitValue: 0,
      left: null,
      right: null,
      size,
      depth: currentDepth,
    };
  }

  const splitValue = fMin + Math.random() * (fMax - fMin);

  const leftData: number[][] = [];
  const rightData: number[][] = [];
  for (const row of data) {
    if (row[splitFeature] < splitValue) {
      leftData.push(row);
    } else {
      rightData.push(row);
    }
  }

  return {
    splitFeature,
    splitValue,
    left: buildIsolationTree(leftData, maxDepth, currentDepth + 1),
    right: buildIsolationTree(rightData, maxDepth, currentDepth + 1),
    size,
    depth: currentDepth,
  };
}

function pathLength(point: number[], tree: IsolationTree, depth: number): number {
  if (tree.left === null || tree.right === null) {
    return depth + averagePathLength(tree.size);
  }
  if (point[tree.splitFeature] < tree.splitValue) {
    return pathLength(point, tree.left, depth + 1);
  }
  return pathLength(point, tree.right, depth + 1);
}

export class IsolationForest {
  private trees: IsolationTree[] = [];
  private sampleSize: number;
  private numTrees: number;
  private maxDepth: number;
  private trainSize = 0;

  constructor(
    options: { numTrees?: number; sampleSize?: number; maxDepth?: number } = {}
  ) {
    this.numTrees = options.numTrees ?? 100;
    this.sampleSize = options.sampleSize ?? 256;
    this.maxDepth = options.maxDepth ?? 0; // 0 = auto
  }

  fit(data: number[][]): void {
    if (data.length === 0) return;
    const effectiveSample = Math.min(this.sampleSize, data.length);
    const effectiveDepth =
      this.maxDepth > 0
        ? this.maxDepth
        : Math.ceil(Math.log2(effectiveSample));
    this.trainSize = data.length;
    this.trees = [];

    for (let t = 0; t < this.numTrees; t++) {
      // Subsample
      const sample: number[][] = [];
      const indices = new Set<number>();
      while (indices.size < effectiveSample) {
        indices.add(Math.floor(Math.random() * data.length));
      }
      for (const idx of indices) {
        sample.push(data[idx]);
      }
      this.trees.push(buildIsolationTree(sample, effectiveDepth, 0));
    }
  }

  /** Returns anomaly score 0-1 (higher = more anomalous) */
  predict(point: number[]): number {
    if (this.trees.length === 0) return 0;
    let totalPath = 0;
    for (const tree of this.trees) {
      totalPath += pathLength(point, tree, 0);
    }
    const avgPath = totalPath / this.trees.length;
    const c = averagePathLength(this.sampleSize);
    if (c === 0) return 0;
    return Math.pow(2, -(avgPath / c));
  }

  predictBatch(
    data: number[][]
  ): { index: number; score: number; isAnomaly: boolean }[] {
    return data.map((point, index) => {
      const score = this.predict(point);
      return { index, score, isAnomaly: score > 0.6 };
    });
  }
}

// ---- Temporal Pattern Detection ----

export function detectTemporalAnomalies(
  events: { timestamp: Date; value?: number; type?: string }[],
  options: {
    businessHoursStart?: number;
    businessHoursEnd?: number;
    timezone?: string;
  } = {}
): {
  anomalies: { timestamp: Date; reason: string; score: number }[];
  patterns: { hourDistribution: number[]; dayOfWeekDistribution: number[] };
} {
  const bizStart = options.businessHoursStart ?? 8;
  const bizEnd = options.businessHoursEnd ?? 18;

  const hourDist = new Array(24).fill(0);
  const dowDist = new Array(7).fill(0);

  for (const e of events) {
    const h = e.timestamp.getUTCHours();
    const d = e.timestamp.getUTCDay();
    hourDist[h]++;
    dowDist[d]++;
  }

  const totalEvents = events.length || 1;
  const hourProb = hourDist.map((c: number) => c / totalEvents);

  const anomalies: { timestamp: Date; reason: string; score: number }[] = [];

  for (const e of events) {
    const h = e.timestamp.getUTCHours();
    const d = e.timestamp.getUTCDay();

    // Outside business hours
    if (h < bizStart || h >= bizEnd) {
      const freq = hourProb[h];
      const score = Math.min(100, Math.round((1 - freq) * 60 + 20));
      anomalies.push({
        timestamp: e.timestamp,
        reason: `Activity at ${h}:00 UTC is outside business hours (${bizStart}-${bizEnd})`,
        score,
      });
    }

    // Weekend activity
    if (d === 0 || d === 6) {
      const weekendTotal = dowDist[0] + dowDist[6];
      const weekendRatio = weekendTotal / totalEvents;
      const score =
        weekendRatio < 0.05
          ? 85
          : weekendRatio < 0.15
            ? 60
            : 35;
      anomalies.push({
        timestamp: e.timestamp,
        reason: `Weekend activity detected (${d === 0 ? "Sunday" : "Saturday"})`,
        score,
      });
    }

    // Very low frequency hour
    if (hourProb[h] < 0.01 && events.length > 50) {
      anomalies.push({
        timestamp: e.timestamp,
        reason: `Activity at hour ${h} is extremely rare (<1% of all events)`,
        score: 75,
      });
    }
  }

  return {
    anomalies,
    patterns: {
      hourDistribution: hourDist,
      dayOfWeekDistribution: dowDist,
    },
  };
}

// ---- Behavioral Analysis ----

export function detectBehavioralAnomalies(
  userActivity: {
    userId: string;
    timestamp: Date;
    action: string;
    resourceType?: string;
    amount?: number;
    ipAddress?: string;
  }[],
  baseline?: {
    typicalActionsPerDay: number;
    typicalHours: number[];
    typicalResources: string[];
  }
): {
  userId: string;
  anomalies: {
    type:
      | "VOLUME_SPIKE"
      | "UNUSUAL_HOURS"
      | "NEW_RESOURCE"
      | "AMOUNT_OUTLIER"
      | "VELOCITY_CHANGE";
    description: string;
    score: number;
    evidence: string;
  }[];
} {
  if (userActivity.length === 0) {
    return { userId: "", anomalies: [] };
  }

  const userId = userActivity[0].userId;
  const anomalies: {
    type:
      | "VOLUME_SPIKE"
      | "UNUSUAL_HOURS"
      | "NEW_RESOURCE"
      | "AMOUNT_OUTLIER"
      | "VELOCITY_CHANGE";
    description: string;
    score: number;
    evidence: string;
  }[] = [];

  // Compute per-day counts
  const dayCounts = new Map<string, number>();
  for (const a of userActivity) {
    const dayKey = a.timestamp.toISOString().slice(0, 10);
    dayCounts.set(dayKey, (dayCounts.get(dayKey) || 0) + 1);
  }
  const dailyCounts = Array.from(dayCounts.values());
  const avgDaily =
    baseline?.typicalActionsPerDay ??
    (dailyCounts.length > 0
      ? dailyCounts.reduce((s, v) => s + v, 0) / dailyCounts.length
      : 0);

  // Volume spike detection
  for (const [day, count] of dayCounts.entries()) {
    if (avgDaily > 0 && count > avgDaily * 3) {
      anomalies.push({
        type: "VOLUME_SPIKE",
        description: `${count} actions on ${day} — ${(count / avgDaily).toFixed(1)}x above daily average`,
        score: Math.min(95, Math.round(50 + ((count / avgDaily - 3) / 3) * 30)),
        evidence: `Daily average: ${avgDaily.toFixed(0)}, observed: ${count}`,
      });
    }
  }

  // Unusual hours
  const typicalHours = new Set(baseline?.typicalHours ?? [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
  const offHoursActions = userActivity.filter(
    (a) => !typicalHours.has(a.timestamp.getUTCHours())
  );
  if (offHoursActions.length > 0) {
    const ratio = offHoursActions.length / userActivity.length;
    if (ratio > 0.1) {
      anomalies.push({
        type: "UNUSUAL_HOURS",
        description: `${offHoursActions.length} actions outside typical hours (${(ratio * 100).toFixed(0)}%)`,
        score: Math.min(90, Math.round(40 + ratio * 100)),
        evidence: `Off-hours actions: ${offHoursActions.length} of ${userActivity.length}`,
      });
    }
  }

  // New resource types
  const typicalRes = new Set(baseline?.typicalResources ?? []);
  if (typicalRes.size > 0) {
    const newResources = new Set<string>();
    for (const a of userActivity) {
      if (a.resourceType && !typicalRes.has(a.resourceType)) {
        newResources.add(a.resourceType);
      }
    }
    if (newResources.size > 0) {
      anomalies.push({
        type: "NEW_RESOURCE",
        description: `Accessed ${newResources.size} previously unseen resource type(s)`,
        score: Math.min(80, 40 + newResources.size * 15),
        evidence: `New resources: ${Array.from(newResources).join(", ")}`,
      });
    }
  }

  // Amount outliers
  const amounts = userActivity
    .filter((a) => a.amount !== undefined && a.amount !== null)
    .map((a) => a.amount!);
  if (amounts.length >= 5) {
    const zResults = detectZScoreAnomalies(amounts, 2.5);
    const outliers = zResults.filter((r) => r.isAnomaly);
    for (const o of outliers) {
      anomalies.push({
        type: "AMOUNT_OUTLIER",
        description: `Transaction amount ${o.value} is ${o.zScore.toFixed(1)} standard deviations from mean`,
        score: Math.min(95, Math.round(50 + o.zScore * 10)),
        evidence: `z-score: ${o.zScore.toFixed(2)}, mean: ${mean(amounts).toFixed(2)}`,
      });
    }
  }

  // Velocity change — compare first half vs second half action rate
  if (userActivity.length >= 10) {
    const sorted = [...userActivity].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
    const mid = Math.floor(sorted.length / 2);
    const firstHalfSpan =
      sorted[mid - 1].timestamp.getTime() - sorted[0].timestamp.getTime();
    const secondHalfSpan =
      sorted[sorted.length - 1].timestamp.getTime() - sorted[mid].timestamp.getTime();
    if (firstHalfSpan > 0 && secondHalfSpan > 0) {
      const firstRate = mid / (firstHalfSpan / 3600000);
      const secondRate = (sorted.length - mid) / (secondHalfSpan / 3600000);
      const ratio = secondRate / firstRate;
      if (ratio > 3 || ratio < 0.33) {
        anomalies.push({
          type: "VELOCITY_CHANGE",
          description: `Action velocity ${ratio > 1 ? "increased" : "decreased"} by ${ratio > 1 ? ratio.toFixed(1) : (1 / ratio).toFixed(1)}x`,
          score: Math.min(85, Math.round(40 + Math.abs(Math.log2(ratio)) * 15)),
          evidence: `First half: ${firstRate.toFixed(1)}/hr, second half: ${secondRate.toFixed(1)}/hr`,
        });
      }
    }
  }

  return { userId, anomalies };
}

// ---- Main Entry Point ----

export async function runAnomalyDetection(
  organizationId: string,
  options: {
    domains?: string[];
    lookbackDays?: number;
    zScoreThreshold?: number;
    minSampleSize?: number;
  } = {}
): Promise<AnomalyDetectionResult> {
  const lookbackDays = options.lookbackDays ?? 30;
  const zScoreThreshold = options.zScoreThreshold ?? 2.5;
  const minSampleSize = options.minSampleSize ?? 10;
  const since = new Date(Date.now() - lookbackDays * 86_400_000);

  // Fetch connectors for this org
  const connectors = await db.eRPConnector.findMany({
    where: { organizationId, isActive: true },
    select: { id: true },
  });
  const connectorIds = connectors.map((c) => c.id);

  if (connectorIds.length === 0) {
    return {
      organizationId,
      dataPointsAnalyzed: 0,
      anomaliesDetected: 0,
      anomalies: [],
      baselineStats: [],
    };
  }

  // Query ERP data points
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
    take: 10000,
  });

  if (dataPoints.length < minSampleSize) {
    return {
      organizationId,
      dataPointsAnalyzed: dataPoints.length,
      anomaliesDetected: 0,
      anomalies: [],
      baselineStats: [],
    };
  }

  // Extract numeric fields from data JSON
  const numericFields = new Map<string, { values: number[]; dpIds: string[] }>();
  for (const dp of dataPoints) {
    const data = dp.data as Record<string, unknown>;
    if (!data || typeof data !== "object") continue;
    for (const [key, val] of Object.entries(data)) {
      if (typeof val === "number" && isFinite(val)) {
        let entry = numericFields.get(key);
        if (!entry) {
          entry = { values: [], dpIds: [] };
          numericFields.set(key, entry);
        }
        entry.values.push(val);
        entry.dpIds.push(dp.id);
      }
    }
  }

  const anomalies: AnomalyResult[] = [];
  const baselineStats: AnomalyDetectionResult["baselineStats"] = [];

  // Run Z-score + IQR on each numeric field
  for (const [field, { values, dpIds }] of numericFields.entries()) {
    if (values.length < minSampleSize) continue;

    const sorted = sortedCopy(values);
    const m = mean(values);
    const sd = stdDev(values);
    const q1 = percentile(sorted, 25);
    const q3 = percentile(sorted, 75);
    const med = percentile(sorted, 50);

    baselineStats.push({
      field,
      mean: m,
      stdDev: sd,
      median: med,
      q1,
      q3,
      sampleSize: values.length,
    });

    // Z-score anomalies
    const zResults = detectZScoreAnomalies(values, zScoreThreshold);
    for (const r of zResults) {
      if (!r.isAnomaly) continue;
      const score = Math.min(100, Math.round(40 + r.zScore * 12));
      anomalies.push({
        dataPointId: dpIds[r.index],
        anomalyType: "Z_SCORE",
        score,
        severity: scoreToSeverity(score),
        description: `Field "${field}" value ${r.value} is ${r.zScore.toFixed(1)} standard deviations from the mean`,
        expectedRange: { min: m - zScoreThreshold * sd, max: m + zScoreThreshold * sd },
        actualValue: r.value,
        standardDeviationsFromMean: r.zScore,
        context: { field, mean: m, stdDev: sd },
      });
    }

    // IQR anomalies (only add if not already caught by z-score)
    const iqrResults = detectIQRAnomalies(values);
    const zAnomalyIndices = new Set(
      zResults.filter((r) => r.isAnomaly).map((r) => r.index)
    );
    for (const r of iqrResults) {
      if (!r.isAnomaly || zAnomalyIndices.has(r.index)) continue;
      const iqr = q3 - q1;
      const deviation =
        r.bound === "upper"
          ? (r.value - q3) / (iqr || 1)
          : (q1 - r.value) / (iqr || 1);
      const score = Math.min(100, Math.round(35 + deviation * 15));
      anomalies.push({
        dataPointId: dpIds[r.index],
        anomalyType: "IQR_OUTLIER",
        score,
        severity: scoreToSeverity(score),
        description: `Field "${field}" value ${r.value} is a ${r.bound} IQR outlier`,
        expectedRange: { min: q1 - 1.5 * iqr, max: q3 + 1.5 * iqr },
        actualValue: r.value,
        standardDeviationsFromMean: sd > 0 ? Math.abs((r.value - m) / sd) : 0,
        context: { field, q1, q3, iqr, bound: r.bound },
      });
    }
  }

  // Temporal anomaly detection
  const temporalEvents = dataPoints.map((dp) => ({
    timestamp: dp.pulledAt,
    value: undefined as number | undefined,
    type: dp.dataType,
  }));
  const temporalResults = detectTemporalAnomalies(temporalEvents);
  for (const ta of temporalResults.anomalies) {
    // Find the datapoint closest in time
    let closestDp = dataPoints[0];
    let closestDiff = Infinity;
    for (const dp of dataPoints) {
      const diff = Math.abs(dp.pulledAt.getTime() - ta.timestamp.getTime());
      if (diff < closestDiff) {
        closestDiff = diff;
        closestDp = dp;
      }
    }
    anomalies.push({
      dataPointId: closestDp.id,
      anomalyType: "TEMPORAL",
      score: ta.score,
      severity: scoreToSeverity(ta.score),
      description: ta.reason,
      expectedRange: { min: 8, max: 18 },
      actualValue: ta.timestamp.getUTCHours(),
      standardDeviationsFromMean: 0,
      context: { timestamp: ta.timestamp.toISOString() },
    });
  }

  // Create findings for high-score anomalies
  const highScoreAnomalies = anomalies.filter((a) => a.score >= 70);
  for (const anomaly of highScoreAnomalies.slice(0, 50)) {
    try {
      await db.finding.create({
        data: {
          organizationId,
          title: `Anomaly Detected: ${anomaly.anomalyType}`,
          description: anomaly.description,
          severity: anomaly.severity === "CRITICAL" ? "CRITICAL" : anomaly.severity === "HIGH" ? "HIGH" : "MEDIUM",
          status: "OPEN",
          framework: "CUSTOM",
          dataPoints: {
            create: { dataPointId: anomaly.dataPointId },
          },
        },
      });
    } catch {
      // Finding creation is best-effort; log but don't fail
      console.error(
        `[AnomalyDetection] Failed to create finding for datapoint ${anomaly.dataPointId}`
      );
    }
  }

  return {
    organizationId,
    dataPointsAnalyzed: dataPoints.length,
    anomaliesDetected: anomalies.length,
    anomalies,
    baselineStats,
  };
}
