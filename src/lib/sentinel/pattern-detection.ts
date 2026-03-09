// ============================================
// SENTINEL — Pattern Detection Engine
// Keyword spikes, geographic convergence, anomalies
// ============================================

export interface KeywordSpike {
  keyword: string;
  currentCount: number;
  baselineAvg: number;
  ratio: number;
  sources: string[];
  firstSeen: Date;
  severity: "critical" | "high" | "medium";
}

export interface GeographicConvergence {
  countryCode: string;
  eventTypes: string[];
  eventCount: number;
  timeWindowHours: number;
  severity: "critical" | "high" | "medium";
}

export interface AnomalyDetection {
  metric: string;
  currentValue: number;
  mean: number;
  stdDev: number;
  zScore: number;
  severity: "critical" | "high" | "medium" | "low";
}

// ---- Welford's Online Variance Algorithm ----
// O(1) time and space for running mean and variance

export class WelfordAccumulator {
  count = 0;
  mean = 0;
  m2 = 0;

  update(value: number): void {
    this.count++;
    const delta = value - this.mean;
    this.mean += delta / this.count;
    const delta2 = value - this.mean;
    this.m2 += delta * delta2;
  }

  get variance(): number {
    return this.count < 2 ? 0 : this.m2 / (this.count - 1);
  }

  get stdDev(): number {
    return Math.sqrt(this.variance);
  }

  getZScore(value: number): number {
    if (this.stdDev === 0) return 0;
    return (value - this.mean) / this.stdDev;
  }
}

// ---- Keyword Spike Detection ----

// In-memory keyword tracking (2-hour sliding window vs 7-day baseline)
const keywordWindows = new Map<string, { timestamps: number[]; sources: Set<string> }>();
const keywordBaselines = new Map<string, WelfordAccumulator>();
const SPIKE_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours
const SPIKE_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const lastSpikeAlerts = new Map<string, number>();

const TRACKED_KEYWORDS = [
  // Escalation signals
  "nuclear", "mobilization", "invasion", "declaration of war",
  "state of emergency", "martial law", "evacuation",
  // Weapons
  "ballistic missile", "cruise missile", "hypersonic", "chemical weapon",
  "biological weapon", "dirty bomb",
  // Cyber
  "critical infrastructure", "power grid", "water supply",
  "internet blackout", "communications disruption",
  // Economic
  "sanctions", "embargo", "currency collapse", "bank run",
  "sovereign default", "trade embargo",
  // Political
  "coup attempt", "assassination", "regime change",
  "ceasefire violation", "peace talks collapse",
  // Infrastructure
  "pipeline explosion", "port closure", "strait closure",
  "canal blocked", "airspace closure",
];

export function trackKeywords(
  text: string,
  source: string,
  timestamp: Date = new Date()
): KeywordSpike[] {
  const lower = text.toLowerCase();
  const now = timestamp.getTime();
  const spikes: KeywordSpike[] = [];

  for (const keyword of TRACKED_KEYWORDS) {
    if (!lower.includes(keyword)) continue;

    // Update window
    let window = keywordWindows.get(keyword);
    if (!window) {
      window = { timestamps: [], sources: new Set() };
      keywordWindows.set(keyword, window);
    }

    window.timestamps.push(now);
    window.sources.add(source);

    // Prune old entries
    window.timestamps = window.timestamps.filter(
      (t) => now - t < SPIKE_WINDOW_MS
    );

    const currentCount = window.timestamps.length;

    // Update baseline
    let baseline = keywordBaselines.get(keyword);
    if (!baseline) {
      baseline = new WelfordAccumulator();
      keywordBaselines.set(keyword, baseline);
    }

    // Only add to baseline outside spike windows
    if (currentCount <= 3) {
      baseline.update(currentCount);
    }

    const baselineAvg = Math.max(1, baseline.mean);
    const ratio = currentCount / baselineAvg;

    // Spike detection: 3x+ baseline, 2+ unique sources, cooldown check
    if (
      ratio >= 3 &&
      window.sources.size >= 2 &&
      (!lastSpikeAlerts.has(keyword) ||
        now - lastSpikeAlerts.get(keyword)! > SPIKE_COOLDOWN_MS)
    ) {
      const severity =
        ratio >= 10 ? "critical" : ratio >= 5 ? "high" : "medium";

      spikes.push({
        keyword,
        currentCount,
        baselineAvg: Math.round(baselineAvg * 10) / 10,
        ratio: Math.round(ratio * 10) / 10,
        sources: [...window.sources],
        firstSeen: new Date(window.timestamps[0]),
        severity,
      });

      lastSpikeAlerts.set(keyword, now);
    }
  }

  return spikes;
}

// ---- Geographic Convergence Detection ----
// 3+ distinct event types in same country within 24h → alert

interface GeoEvent {
  countryCode: string;
  category: string;
  timestamp: number;
}

const geoEventBuffer: GeoEvent[] = [];
const GEO_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const GEO_MIN_EVENT_TYPES = 3;

export function trackGeoEvent(
  countryCode: string,
  category: string,
  timestamp: Date = new Date()
): GeographicConvergence | null {
  const now = timestamp.getTime();

  geoEventBuffer.push({ countryCode, category, timestamp: now });

  // Prune old events
  while (geoEventBuffer.length > 0 && now - geoEventBuffer[0].timestamp > GEO_WINDOW_MS) {
    geoEventBuffer.shift();
  }

  // Check convergence for this country
  const countryEvents = geoEventBuffer.filter(
    (e) => e.countryCode === countryCode
  );
  const eventTypes = [...new Set(countryEvents.map((e) => e.category))];

  if (eventTypes.length >= GEO_MIN_EVENT_TYPES) {
    const severity =
      eventTypes.length >= 5 ? "critical" : eventTypes.length >= 4 ? "high" : "medium";

    return {
      countryCode,
      eventTypes,
      eventCount: countryEvents.length,
      timeWindowHours: 24,
      severity,
    };
  }

  return null;
}

// ---- Z-Score Anomaly Detection ----

const metricAccumulators = new Map<string, WelfordAccumulator>();

export function detectAnomaly(
  metric: string,
  value: number
): AnomalyDetection | null {
  let acc = metricAccumulators.get(metric);
  if (!acc) {
    acc = new WelfordAccumulator();
    metricAccumulators.set(metric, acc);
  }

  const zScore = acc.getZScore(value);
  acc.update(value);

  // Need enough data points for meaningful z-scores
  if (acc.count < 10) return null;

  const absZ = Math.abs(zScore);
  if (absZ < 1.5) return null;

  const severity =
    absZ >= 3.0 ? "critical" : absZ >= 2.5 ? "high" : absZ >= 2.0 ? "medium" : "low";

  return {
    metric,
    currentValue: value,
    mean: Math.round(acc.mean * 100) / 100,
    stdDev: Math.round(acc.stdDev * 100) / 100,
    zScore: Math.round(zScore * 100) / 100,
    severity,
  };
}

// ---- Multi-Source Corroboration ----
// No single source triggers critical alerts alone

export interface CorroborationCheck {
  headline: string;
  sources: string[];
  isCorroborated: boolean;
  corroborationLevel: "confirmed" | "likely" | "unconfirmed";
}

export function checkCorroboration(
  headline: string,
  allRecentEvents: { headline: string; source: string }[]
): CorroborationCheck {
  const headlineWords = new Set(
    headline.toLowerCase().split(/\s+/).filter((w) => w.length > 4)
  );

  const matchingSources = new Set<string>();

  for (const event of allRecentEvents) {
    if (event.headline === headline) continue;

    const eventWords = event.headline.toLowerCase().split(/\s+/);
    const overlap = eventWords.filter((w) => headlineWords.has(w)).length;
    const overlapRatio = overlap / Math.max(headlineWords.size, 1);

    if (overlapRatio >= 0.3) {
      matchingSources.add(event.source);
    }
  }

  const sourceCount = matchingSources.size;

  return {
    headline,
    sources: [...matchingSources],
    isCorroborated: sourceCount >= 2,
    corroborationLevel:
      sourceCount >= 3 ? "confirmed" : sourceCount >= 2 ? "likely" : "unconfirmed",
  };
}

// Reset all state (for testing)
export function resetPatternState(): void {
  keywordWindows.clear();
  keywordBaselines.clear();
  lastSpikeAlerts.clear();
  geoEventBuffer.length = 0;
  metricAccumulators.clear();
}
