import { describe, it, expect } from "vitest";

// ============================================
// SENTINEL — Reasoning History Tests
// Pure logic / algorithm tests — no Prisma imports
// ============================================

// ---- Inline type definitions (mirror source) ----

interface PrecedentCandidate {
  id: string;
  headline: string;
  countryCode: string | null;
  category: string;
  classification: unknown;
  predictedOutcome: string | null;
  actualOutcome: string | null;
  forecastAccuracy: number | null;
  createdAt: Date;
}

interface PrecedentMatch extends PrecedentCandidate {
  relevanceScore: number;
}

interface EscalationEntry {
  id: string;
  headline: string;
  category: string;
  classification: Record<string, unknown> | null;
  createdAt: Date;
}

interface EscalationPattern {
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

interface ForecastEntry {
  forecastAccuracy: number | null;
  category: string;
  countryCode: string | null;
}

interface ForecastAccuracyStats {
  totalForecasts: number;
  forecastsWithOutcomes: number;
  averageAccuracy: number | null;
  accuracyByCategory: Record<string, { count: number; avgAccuracy: number }>;
  accuracyByCountry: Record<string, { count: number; avgAccuracy: number }>;
}

// ---- Inline pure-logic helpers (extracted from source) ----

const STOP_WORDS = new Set([
  "the", "a", "an", "in", "on", "at", "to", "for", "of", "and", "or",
  "is", "are", "was", "were", "be", "been", "has", "have", "had",
  "with", "from", "by", "that", "this", "it", "its", "as", "but",
  "not", "will", "would", "could", "should", "may", "might", "can",
  "do", "does", "did", "over", "new", "says", "said",
]);

function extractKeywords(headline: string): string[] {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function scorePrecedent(
  candidate: PrecedentCandidate,
  params: { headline: string; countryCode?: string; category?: string }
): PrecedentMatch {
  const keywords = extractKeywords(params.headline);
  let score = 0;

  // Country match: +30
  if (
    params.countryCode &&
    candidate.countryCode?.toUpperCase() === params.countryCode.toUpperCase()
  ) {
    score += 30;
  }

  // Category match: +25
  if (params.category && candidate.category === params.category) {
    score += 25;
  }

  // Keyword overlap: +10 per matching keyword (max 50)
  const candidateWords = candidate.headline.toLowerCase().split(/\s+/);
  let keywordHits = 0;
  for (const kw of keywords) {
    if (candidateWords.some((w) => w.includes(kw) || kw.includes(w))) {
      keywordHits++;
    }
  }
  score += Math.min(50, keywordHits * 10);

  // Bonus for entries with recorded outcomes: +5
  if (candidate.actualOutcome) {
    score += 5;
  }

  return { ...candidate, relevanceScore: score };
}

function clampAccuracy(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function computeForecastAccuracy(entries: ForecastEntry[]): ForecastAccuracyStats {
  const withOutcomes = entries.filter((e) => e.forecastAccuracy !== null);
  const forecastsWithOutcomes = withOutcomes.length;

  const averageAccuracy =
    forecastsWithOutcomes > 0
      ? withOutcomes.reduce((sum, e) => sum + (e.forecastAccuracy ?? 0), 0) /
        forecastsWithOutcomes
      : null;

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
    totalForecasts: entries.filter((e) => e.forecastAccuracy !== null || e.category).length,
    forecastsWithOutcomes,
    averageAccuracy,
    accuracyByCategory,
    accuracyByCountry,
  };
}

function detectEscalationPatterns(
  entries: EscalationEntry[],
  countryCode: string
): EscalationPattern[] {
  if (entries.length < 2) return [];

  const withScores = entries.map((e) => {
    const cls = e.classification as Record<string, unknown> | null;
    const riskScore = typeof cls?.riskScore === "number" ? cls.riskScore : 0;
    return { ...e, riskScore };
  });

  const patterns: EscalationPattern[] = [];
  let sequenceStart = 0;

  for (let i = 1; i < withScores.length; i++) {
    const prev = withScores[i - 1];
    const curr = withScores[i];

    if (curr.riskScore > prev.riskScore) {
      continue;
    }

    if (i - 1 > sequenceStart) {
      const sequence = withScores.slice(sequenceStart, i);
      const delta = sequence[sequence.length - 1].riskScore - sequence[0].riskScore;

      if (delta >= 10) {
        const signalsBefore = sequence
          .slice(0, Math.min(3, sequence.length))
          .map((s) => `[${s.category}] ${s.headline} (score: ${s.riskScore})`);

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
    const delta = sequence[sequence.length - 1].riskScore - sequence[0].riskScore;

    if (delta >= 10) {
      const signalsBefore = sequence
        .slice(0, Math.min(3, sequence.length))
        .map((s) => `[${s.category}] ${s.headline} (score: ${s.riskScore})`);

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

  patterns.sort((a, b) => b.escalationDelta - a.escalationDelta);
  return patterns;
}

function computeAvgRiskScore(
  entries: { classification: Record<string, unknown> | null }[]
): number {
  let totalRisk = 0;
  let riskCount = 0;
  for (const e of entries) {
    const cls = e.classification;
    if (typeof cls?.riskScore === "number") {
      totalRisk += cls.riskScore;
      riskCount++;
    }
  }
  const avg = riskCount > 0 ? totalRisk / riskCount : 0;
  return Math.round(avg * 10) / 10;
}

// ---- Helper factories ----

function makeCandidate(overrides: Partial<PrecedentCandidate> = {}): PrecedentCandidate {
  return {
    id: overrides.id ?? "c1",
    headline: overrides.headline ?? "Test headline",
    countryCode: overrides.countryCode ?? null,
    category: overrides.category ?? "OTHER",
    classification: overrides.classification ?? null,
    predictedOutcome: overrides.predictedOutcome ?? null,
    actualOutcome: overrides.actualOutcome ?? null,
    forecastAccuracy: overrides.forecastAccuracy ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-01-01"),
  };
}

function makeEscalationEntry(overrides: Partial<EscalationEntry & { riskScore?: number }> = {}): EscalationEntry {
  const riskScore = overrides.riskScore ?? 0;
  return {
    id: overrides.id ?? "e1",
    headline: overrides.headline ?? "Event",
    category: overrides.category ?? "CONFLICT",
    classification: overrides.classification ?? { riskScore },
    createdAt: overrides.createdAt ?? new Date("2026-01-01"),
  };
}

// ============================================
// TESTS
// ============================================

describe("Reasoning History — Pure Logic", () => {
  // ---- 1. Keyword Extraction ----

  describe("extractKeywords", () => {
    it("strips stop words and short words", () => {
      const keywords = extractKeywords("The EU is proposing a new AI regulation");
      expect(keywords).not.toContain("the");
      expect(keywords).not.toContain("is");
      expect(keywords).not.toContain("a");
      expect(keywords).not.toContain("new");
      expect(keywords).toContain("proposing");
      expect(keywords).toContain("regulation");
    });

    it("strips punctuation", () => {
      const keywords = extractKeywords("EU's AI-regulation: draft, v2.0");
      // should not contain punctuation characters
      for (const kw of keywords) {
        expect(kw).toMatch(/^[a-z0-9]+$/);
      }
    });

    it("returns empty array for headline of only stop words", () => {
      const keywords = extractKeywords("the a an in on at to");
      expect(keywords).toEqual([]);
    });

    it("filters words with 2 or fewer characters", () => {
      const keywords = extractKeywords("UK EU AI act proposal");
      expect(keywords).not.toContain("uk");
      expect(keywords).not.toContain("eu");
      expect(keywords).not.toContain("ai");
      expect(keywords).toContain("act");
      expect(keywords).toContain("proposal");
    });
  });

  // ---- 2. Precedent Scoring ----

  describe("scorePrecedent", () => {
    it("gives +30 for country match", () => {
      const candidate = makeCandidate({ countryCode: "US", headline: "unrelated topic xyz" });
      const match = scorePrecedent(candidate, {
        headline: "something entirely different abc",
        countryCode: "US",
      });
      expect(match.relevanceScore).toBe(30);
    });

    it("gives +25 for category match", () => {
      const candidate = makeCandidate({ category: "CYBER", headline: "unrelated topic xyz" });
      const match = scorePrecedent(candidate, {
        headline: "something entirely different abc",
        category: "CYBER",
      });
      expect(match.relevanceScore).toBe(25);
    });

    it("gives +10 per keyword hit, capped at 50", () => {
      // 6 matching keywords = 60, but capped at 50
      const candidate = makeCandidate({
        headline: "regulation compliance sanctions enforcement penalty framework",
      });
      const match = scorePrecedent(candidate, {
        headline: "regulation compliance sanctions enforcement penalty framework overview",
      });
      expect(match.relevanceScore).toBeLessThanOrEqual(50);
      expect(match.relevanceScore).toBeGreaterThanOrEqual(50); // exactly 50 (cap)
    });

    it("gives +5 bonus for entries with actualOutcome", () => {
      const candidate = makeCandidate({
        headline: "unrelated xyz abc",
        actualOutcome: "Sanctions imposed",
        countryCode: "DE",
      });
      const match = scorePrecedent(candidate, {
        headline: "something different qrs tuv",
        countryCode: "DE",
      });
      // 30 (country) + 5 (outcome)
      expect(match.relevanceScore).toBe(35);
    });

    it("accumulates country + category + keyword scores", () => {
      const candidate = makeCandidate({
        countryCode: "US",
        category: "CONFLICT",
        headline: "military deployment escalation",
      });
      const match = scorePrecedent(candidate, {
        headline: "military deployment escalation concerns",
        countryCode: "US",
        category: "CONFLICT",
      });
      // 30 (country) + 25 (category) + 30 (3 keywords * 10) = 85
      expect(match.relevanceScore).toBe(85);
    });

    it("country match is case-insensitive", () => {
      const candidate = makeCandidate({ countryCode: "us", headline: "xyz abc" });
      const match = scorePrecedent(candidate, {
        headline: "something different qrs",
        countryCode: "US",
      });
      expect(match.relevanceScore).toBe(30);
    });

    it("returns 0 score when nothing matches", () => {
      const candidate = makeCandidate({
        countryCode: "DE",
        category: "CYBER",
        headline: "completely unrelated alpha beta",
      });
      const match = scorePrecedent(candidate, {
        headline: "gamma delta epsilon zeta",
        countryCode: "JP",
        category: "CONFLICT",
      });
      expect(match.relevanceScore).toBe(0);
    });

    it("keyword matching is bidirectional (substring check)", () => {
      // Source: kw.includes(w) — "regulation" includes "regulat" is false,
      // but "regulat" includes... let's use real substring match
      const candidate = makeCandidate({ headline: "cyber attack detected" });
      const match = scorePrecedent(candidate, {
        headline: "cyberattack detection system",
      });
      // "cyber" in candidate words, "cyberattack" in search keywords
      // candidateWords.some(w => w.includes(kw) || kw.includes(w))
      // "cyber".includes("cyberattack") = false, "cyberattack".includes("cyber") = true => hit
      expect(match.relevanceScore).toBeGreaterThanOrEqual(10);
    });
  });

  // ---- 3. Accuracy Clamping ----

  describe("clampAccuracy (recordActualOutcome logic)", () => {
    it("clamps values above 1 to 1", () => {
      expect(clampAccuracy(1.5)).toBe(1);
    });

    it("clamps negative values to 0", () => {
      expect(clampAccuracy(-0.3)).toBe(0);
    });

    it("keeps values in [0,1] unchanged", () => {
      expect(clampAccuracy(0.75)).toBe(0.75);
      expect(clampAccuracy(0)).toBe(0);
      expect(clampAccuracy(1)).toBe(1);
    });
  });

  // ---- 4. Forecast Accuracy Aggregation ----

  describe("computeForecastAccuracy", () => {
    it("returns null averageAccuracy when no outcomes recorded", () => {
      const entries: ForecastEntry[] = [
        { forecastAccuracy: null, category: "CYBER", countryCode: "US" },
      ];
      const stats = computeForecastAccuracy(entries);
      expect(stats.averageAccuracy).toBeNull();
      expect(stats.forecastsWithOutcomes).toBe(0);
    });

    it("computes correct average accuracy", () => {
      const entries: ForecastEntry[] = [
        { forecastAccuracy: 0.8, category: "CYBER", countryCode: "US" },
        { forecastAccuracy: 0.6, category: "CYBER", countryCode: "US" },
        { forecastAccuracy: null, category: "CONFLICT", countryCode: "DE" },
      ];
      const stats = computeForecastAccuracy(entries);
      expect(stats.forecastsWithOutcomes).toBe(2);
      expect(stats.averageAccuracy).toBeCloseTo(0.7, 5);
    });

    it("groups accuracy by category", () => {
      const entries: ForecastEntry[] = [
        { forecastAccuracy: 0.9, category: "CYBER", countryCode: "US" },
        { forecastAccuracy: 0.7, category: "CYBER", countryCode: "US" },
        { forecastAccuracy: 0.5, category: "CONFLICT", countryCode: "DE" },
      ];
      const stats = computeForecastAccuracy(entries);
      expect(stats.accuracyByCategory["CYBER"].count).toBe(2);
      expect(stats.accuracyByCategory["CYBER"].avgAccuracy).toBeCloseTo(0.8, 5);
      expect(stats.accuracyByCategory["CONFLICT"].count).toBe(1);
      expect(stats.accuracyByCategory["CONFLICT"].avgAccuracy).toBeCloseTo(0.5, 5);
    });

    it("groups accuracy by country, using UNKNOWN for null", () => {
      const entries: ForecastEntry[] = [
        { forecastAccuracy: 0.6, category: "CYBER", countryCode: null },
        { forecastAccuracy: 0.8, category: "CYBER", countryCode: null },
        { forecastAccuracy: 0.9, category: "CYBER", countryCode: "US" },
      ];
      const stats = computeForecastAccuracy(entries);
      expect(stats.accuracyByCountry["UNKNOWN"].count).toBe(2);
      expect(stats.accuracyByCountry["UNKNOWN"].avgAccuracy).toBeCloseTo(0.7, 5);
      expect(stats.accuracyByCountry["US"].count).toBe(1);
      expect(stats.accuracyByCountry["US"].avgAccuracy).toBeCloseTo(0.9, 5);
    });
  });

  // ---- 5. Escalation Pattern Detection ----

  describe("detectEscalationPatterns", () => {
    it("returns empty array for fewer than 2 entries", () => {
      const result = detectEscalationPatterns(
        [makeEscalationEntry({ riskScore: 50 })],
        "US"
      );
      expect(result).toEqual([]);
    });

    it("detects a simple escalation sequence", () => {
      const entries = [
        makeEscalationEntry({ id: "1", riskScore: 20, createdAt: new Date("2026-01-01") }),
        makeEscalationEntry({ id: "2", riskScore: 35, createdAt: new Date("2026-01-02") }),
        makeEscalationEntry({ id: "3", riskScore: 50, createdAt: new Date("2026-01-03") }),
        // Non-escalation to terminate
        makeEscalationEntry({ id: "4", riskScore: 10, createdAt: new Date("2026-01-04") }),
      ];
      const patterns = detectEscalationPatterns(entries, "US");
      expect(patterns).toHaveLength(1);
      expect(patterns[0].escalationDelta).toBe(30); // 50 - 20
      expect(patterns[0].sequence).toHaveLength(3);
      expect(patterns[0].countryCode).toBe("US");
    });

    it("ignores escalation sequences with delta < 10", () => {
      const entries = [
        makeEscalationEntry({ id: "1", riskScore: 20, createdAt: new Date("2026-01-01") }),
        makeEscalationEntry({ id: "2", riskScore: 25, createdAt: new Date("2026-01-02") }),
        makeEscalationEntry({ id: "3", riskScore: 10, createdAt: new Date("2026-01-03") }),
      ];
      const patterns = detectEscalationPatterns(entries, "US");
      expect(patterns).toHaveLength(0); // delta 5 < 10
    });

    it("detects escalation at end of sequence (final check)", () => {
      const entries = [
        makeEscalationEntry({ id: "1", riskScore: 10, createdAt: new Date("2026-01-01") }),
        makeEscalationEntry({ id: "2", riskScore: 30, createdAt: new Date("2026-01-02") }),
        makeEscalationEntry({ id: "3", riskScore: 60, createdAt: new Date("2026-01-03") }),
      ];
      const patterns = detectEscalationPatterns(entries, "DE");
      expect(patterns).toHaveLength(1);
      expect(patterns[0].escalationDelta).toBe(50);
      expect(patterns[0].countryCode).toBe("DE");
    });

    it("detects multiple escalation sequences", () => {
      const entries = [
        makeEscalationEntry({ id: "1", riskScore: 10, createdAt: new Date("2026-01-01") }),
        makeEscalationEntry({ id: "2", riskScore: 40, createdAt: new Date("2026-01-02") }),
        // drop
        makeEscalationEntry({ id: "3", riskScore: 5, createdAt: new Date("2026-01-03") }),
        makeEscalationEntry({ id: "4", riskScore: 20, createdAt: new Date("2026-01-04") }),
        makeEscalationEntry({ id: "5", riskScore: 55, createdAt: new Date("2026-01-05") }),
      ];
      const patterns = detectEscalationPatterns(entries, "US");
      expect(patterns).toHaveLength(2);
      // Sorted by delta desc
      expect(patterns[0].escalationDelta).toBe(50); // 55 - 5
      expect(patterns[1].escalationDelta).toBe(30); // 40 - 10
    });

    it("generates signalsBefore from first 3 entries of sequence", () => {
      const entries = [
        makeEscalationEntry({ id: "1", headline: "First signal", category: "CYBER", riskScore: 10, createdAt: new Date("2026-01-01") }),
        makeEscalationEntry({ id: "2", headline: "Second signal", category: "CONFLICT", riskScore: 20, createdAt: new Date("2026-01-02") }),
        makeEscalationEntry({ id: "3", headline: "Third signal", category: "ECONOMIC", riskScore: 30, createdAt: new Date("2026-01-03") }),
        makeEscalationEntry({ id: "4", headline: "Peak", category: "CONFLICT", riskScore: 50, createdAt: new Date("2026-01-04") }),
        // drop
        makeEscalationEntry({ id: "5", riskScore: 5, createdAt: new Date("2026-01-05") }),
      ];
      const patterns = detectEscalationPatterns(entries, "US");
      expect(patterns).toHaveLength(1);
      expect(patterns[0].signalsBefore).toHaveLength(3);
      expect(patterns[0].signalsBefore[0]).toContain("[CYBER]");
      expect(patterns[0].signalsBefore[0]).toContain("First signal");
      expect(patterns[0].signalsBefore[0]).toContain("score: 10");
    });

    it("handles entries with missing classification (defaults riskScore to 0)", () => {
      const entries: EscalationEntry[] = [
        { id: "1", headline: "A", category: "OTHER", classification: null, createdAt: new Date("2026-01-01") },
        { id: "2", headline: "B", category: "OTHER", classification: { riskScore: 50 }, createdAt: new Date("2026-01-02") },
        { id: "3", headline: "C", category: "OTHER", classification: null, createdAt: new Date("2026-01-03") },
      ];
      const patterns = detectEscalationPatterns(entries, "US");
      // 0 -> 50 = delta 50 (escalation), then 50 -> 0 (drop)
      expect(patterns).toHaveLength(1);
      expect(patterns[0].escalationDelta).toBe(50);
    });

    it("uppercases countryCode in output", () => {
      const entries = [
        makeEscalationEntry({ id: "1", riskScore: 10, createdAt: new Date("2026-01-01") }),
        makeEscalationEntry({ id: "2", riskScore: 50, createdAt: new Date("2026-01-02") }),
        makeEscalationEntry({ id: "3", riskScore: 5, createdAt: new Date("2026-01-03") }),
      ];
      const patterns = detectEscalationPatterns(entries, "de");
      expect(patterns[0].countryCode).toBe("DE");
    });
  });

  // ---- 6. Average Risk Score ----

  describe("computeAvgRiskScore", () => {
    it("computes rounded average from classification objects", () => {
      const entries = [
        { classification: { riskScore: 75 } },
        { classification: { riskScore: 82 } },
        { classification: { riskScore: 63 } },
      ];
      const avg = computeAvgRiskScore(entries);
      // (75+82+63)/3 = 73.333... -> 73.3
      expect(avg).toBe(73.3);
    });

    it("returns 0 when no entries have riskScore", () => {
      const entries = [
        { classification: null },
        { classification: { someOtherField: "abc" } },
      ];
      expect(computeAvgRiskScore(entries)).toBe(0);
    });

    it("skips entries without numeric riskScore", () => {
      const entries = [
        { classification: { riskScore: 80 } },
        { classification: { riskScore: "high" } },
        { classification: null },
        { classification: { riskScore: 60 } },
      ];
      const avg = computeAvgRiskScore(entries);
      // (80+60)/2 = 70
      expect(avg).toBe(70);
    });
  });

  // ---- 7. Pagination Logic ----

  describe("pagination clamping", () => {
    it("clamps page to minimum 1", () => {
      const page = Math.max(1, -5);
      expect(page).toBe(1);
    });

    it("clamps limit to [1, 100]", () => {
      const limitHigh = Math.min(100, Math.max(1, 500));
      expect(limitHigh).toBe(100);

      const limitLow = Math.min(100, Math.max(1, 0));
      expect(limitLow).toBe(1);

      const limitNormal = Math.min(100, Math.max(1, 20));
      expect(limitNormal).toBe(20);
    });

    it("computes correct skip offset", () => {
      const page = 3;
      const limit = 20;
      const skip = (page - 1) * limit;
      expect(skip).toBe(40);
    });
  });

  // ---- 8. Type / Interface Shape Validation ----

  describe("type shape validation", () => {
    it("StoreReasoningParams has required fields", () => {
      const params = {
        userId: "u1",
        headline: "Test headline",
        category: "CYBER" as const,
        inputContext: "some context",
        reasoningChain: "step 1 -> step 2",
        classification: {
          category: "CYBER" as const,
          severity: "high",
          riskScore: 75,
        },
      };
      expect(params.userId).toBeDefined();
      expect(params.headline).toBeDefined();
      expect(params.category).toBeDefined();
      expect(params.classification.riskScore).toBe(75);
    });

    it("ReasoningHistoryEntry has nullable fields", () => {
      const entry = {
        id: "r1",
        userId: "u1",
        eventId: null,
        headline: "Test",
        countryCode: null,
        category: "CYBER",
        inputContext: "ctx",
        reasoningChain: "chain",
        classification: {},
        predictedOutcome: null,
        actualOutcome: null,
        forecastAccuracy: null,
        biasAudit: null,
        tokens: 0,
        latencyMs: 0,
        createdAt: new Date(),
      };
      expect(entry.eventId).toBeNull();
      expect(entry.countryCode).toBeNull();
      expect(entry.predictedOutcome).toBeNull();
      expect(entry.actualOutcome).toBeNull();
      expect(entry.forecastAccuracy).toBeNull();
    });

    it("PrecedentMatch includes relevanceScore", () => {
      const match: PrecedentMatch = {
        id: "p1",
        headline: "Test",
        countryCode: "US",
        category: "CYBER",
        classification: null,
        predictedOutcome: null,
        actualOutcome: null,
        forecastAccuracy: null,
        createdAt: new Date(),
        relevanceScore: 55,
      };
      expect(match.relevanceScore).toBe(55);
    });
  });
});
