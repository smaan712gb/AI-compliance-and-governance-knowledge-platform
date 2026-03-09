import { describe, it, expect } from "vitest";
import {
  generateMarketSignals,
  calculateMarketRiskScore,
  scoreToRiskLevel,
  GEOPOLITICAL_COMMODITIES,
  GEOPOLITICAL_FOREX_PAIRS,
  SECTOR_GEO_EXPOSURE,
} from "../macro-market";
import type {
  CommoditySnapshot,
  ForexSnapshot,
  TreasurySnapshot,
  MarketSignal,
} from "../macro-market";

// ---------------------------------------------------------------------------
// Helpers — factory functions for test data
// ---------------------------------------------------------------------------

function makeCommodity(overrides: Partial<CommoditySnapshot> = {}): CommoditySnapshot {
  return {
    symbol: "CLUSD",
    name: "Crude Oil",
    price: 85.0,
    changesPercentage: 1.0,
    dayHigh: 86.0,
    dayLow: 84.0,
    geopoliticalRelevance: "Energy supply disruption",
    ...overrides,
  };
}

function makeForex(overrides: Partial<ForexSnapshot> = {}): ForexSnapshot {
  return {
    pair: "EURUSD",
    price: 1.08,
    change: 0.002,
    changesPercentage: 0.18,
    stabilitySignal: "stable",
    ...overrides,
  };
}

function makeTreasury(overrides: Partial<TreasurySnapshot> = {}): TreasurySnapshot {
  return {
    date: "2026-03-09",
    month1: 5.25,
    month6: 5.1,
    year1: 4.9,
    year2: 4.5,
    year5: 4.2,
    year10: 4.3,
    year30: 4.5,
    yieldCurveInverted: false,
    ...overrides,
  };
}

function makeSignal(overrides: Partial<MarketSignal> = {}): MarketSignal {
  return {
    indicator: "Test",
    value: 50,
    change: 2,
    changeDirection: "up",
    significance: "medium",
    geopoliticalContext: "Test context",
    ...overrides,
  };
}

// ===========================================================================
// GEOPOLITICAL_COMMODITIES constant
// ===========================================================================

describe("GEOPOLITICAL_COMMODITIES", () => {
  it("contains entries for key commodity symbols", () => {
    expect(GEOPOLITICAL_COMMODITIES).toHaveProperty("CLUSD");
    expect(GEOPOLITICAL_COMMODITIES).toHaveProperty("GCUSD");
    expect(GEOPOLITICAL_COMMODITIES).toHaveProperty("WTUSD");
  });

  it("each entry is a non-empty relevance string", () => {
    for (const [, value] of Object.entries(GEOPOLITICAL_COMMODITIES)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("has at least 5 commodities", () => {
    expect(Object.keys(GEOPOLITICAL_COMMODITIES).length).toBeGreaterThanOrEqual(5);
  });
});

// ===========================================================================
// GEOPOLITICAL_FOREX_PAIRS constant
// ===========================================================================

describe("GEOPOLITICAL_FOREX_PAIRS", () => {
  it("contains key pairs", () => {
    expect(GEOPOLITICAL_FOREX_PAIRS).toHaveProperty("EURUSD");
    expect(GEOPOLITICAL_FOREX_PAIRS).toHaveProperty("USDRUB");
    expect(GEOPOLITICAL_FOREX_PAIRS).toHaveProperty("USDCNY");
  });

  it("has at least 6 pairs", () => {
    expect(Object.keys(GEOPOLITICAL_FOREX_PAIRS).length).toBeGreaterThanOrEqual(6);
  });
});

// ===========================================================================
// SECTOR_GEO_EXPOSURE constant
// ===========================================================================

describe("SECTOR_GEO_EXPOSURE", () => {
  it('energy sector has "high" exposure', () => {
    // Try common casing variants
    const key = Object.keys(SECTOR_GEO_EXPOSURE).find(
      (k) => k.toLowerCase() === "energy"
    );
    expect(key).toBeDefined();
    expect(SECTOR_GEO_EXPOSURE[key!]).toBe("high");
  });

  it('technology sector has "medium" exposure', () => {
    const key = Object.keys(SECTOR_GEO_EXPOSURE).find(
      (k) => k.toLowerCase() === "technology"
    );
    expect(key).toBeDefined();
    expect(SECTOR_GEO_EXPOSURE[key!]).toBe("medium");
  });

  it('all values are valid ("high" | "medium" | "low")', () => {
    const validValues = new Set(["high", "medium", "low"]);
    for (const [, value] of Object.entries(SECTOR_GEO_EXPOSURE)) {
      expect(validValues.has(value)).toBe(true);
    }
  });
});

// ===========================================================================
// generateMarketSignals
// ===========================================================================

describe("generateMarketSignals", () => {
  it("returns empty array when all inputs are null/empty", () => {
    const signals = generateMarketSignals([], [], null, null);
    expect(signals).toEqual([]);
  });

  it("oil spike >5% generates a high+ significance signal", () => {
    const oil = makeCommodity({
      symbol: "CLUSD",
      name: "Crude Oil",
      changesPercentage: 6.5,
      geopoliticalRelevance: "Energy supply disruption",
    });
    const signals = generateMarketSignals([oil], [], null, null);
    const oilSignal = signals.find(
      (s) => s.indicator.toLowerCase().includes("oil") || s.indicator.includes("CLUSD")
    );
    expect(oilSignal).toBeDefined();
    expect(["critical", "high"]).toContain(oilSignal!.significance);
  });

  it("gold spike >3% generates a signal about safe-haven demand", () => {
    const gold = makeCommodity({
      symbol: "GCUSD",
      name: "Gold",
      changesPercentage: 4.0,
      geopoliticalRelevance: "Safe-haven demand",
    });
    const signals = generateMarketSignals([gold], [], null, null);
    const goldSignal = signals.find(
      (s) =>
        s.indicator.toLowerCase().includes("gold") ||
        s.indicator.includes("GCUSD") ||
        s.geopoliticalContext.toLowerCase().includes("safe-haven") ||
        s.geopoliticalContext.toLowerCase().includes("safe haven")
    );
    expect(goldSignal).toBeDefined();
  });

  it("VIX >30 generates critical significance signal", () => {
    const signals = generateMarketSignals([], [], null, 35);
    const vixSignal = signals.find(
      (s) => s.indicator.toLowerCase().includes("vix")
    );
    expect(vixSignal).toBeDefined();
    expect(vixSignal!.significance).toBe("critical");
  });

  it("VIX >20 but <30 generates high significance signal", () => {
    const signals = generateMarketSignals([], [], null, 25);
    const vixSignal = signals.find(
      (s) => s.indicator.toLowerCase().includes("vix")
    );
    expect(vixSignal).toBeDefined();
    expect(vixSignal!.significance).toBe("high");
  });

  it("VIX <15 does not generate a signal (calm market)", () => {
    const signals = generateMarketSignals([], [], null, 12);
    const vixSignal = signals.find(
      (s) => s.indicator.toLowerCase().includes("vix")
    );
    expect(vixSignal).toBeUndefined();
  });

  it("yield curve inversion generates high significance signal", () => {
    const treasury = makeTreasury({
      year2: 4.8,
      year10: 4.3,
      yieldCurveInverted: true,
    });
    const signals = generateMarketSignals([], [], treasury, null);
    const yieldSignal = signals.find(
      (s) =>
        s.indicator.toLowerCase().includes("yield") ||
        s.indicator.toLowerCase().includes("treasury") ||
        s.indicator.toLowerCase().includes("curve")
    );
    expect(yieldSignal).toBeDefined();
    expect(["critical", "high"]).toContain(yieldSignal!.significance);
  });

  it("forex pair with >3% change generates crisis-related signal", () => {
    const forex = makeForex({
      pair: "USDRUB",
      changesPercentage: 4.5,
      stabilitySignal: "crisis",
    });
    const signals = generateMarketSignals([], [forex], null, null);
    const fxSignal = signals.find(
      (s) =>
        s.indicator.includes("USDRUB") ||
        s.indicator.toLowerCase().includes("forex") ||
        s.indicator.toLowerCase().includes("rub")
    );
    expect(fxSignal).toBeDefined();
    expect(["critical", "high"]).toContain(fxSignal!.significance);
  });

  it("multiple signals can be generated from combined data", () => {
    const oil = makeCommodity({
      symbol: "CLUSD",
      changesPercentage: 7.0,
    });
    const forex = makeForex({
      pair: "USDRUB",
      changesPercentage: 5.0,
      stabilitySignal: "crisis",
    });
    const treasury = makeTreasury({ yieldCurveInverted: true, year2: 5.0, year10: 4.2 });
    const signals = generateMarketSignals([oil], [forex], treasury, 32);
    expect(signals.length).toBeGreaterThanOrEqual(3);
  });

  it("signal changeDirection correctly reflects positive/negative changes", () => {
    const rising = makeCommodity({
      symbol: "CLUSD",
      changesPercentage: 6.0,
    });
    const falling = makeCommodity({
      symbol: "GCUSD",
      name: "Gold",
      changesPercentage: -5.0,
      geopoliticalRelevance: "Safe-haven demand",
    });
    const signals = generateMarketSignals([rising, falling], [], null, null);

    const risingSignal = signals.find(
      (s) => s.indicator.includes("CLUSD") || (s.indicator.toLowerCase().includes("oil") && s.change > 0)
    );
    const fallingSignal = signals.find(
      (s) => s.indicator.includes("GCUSD") || (s.indicator.toLowerCase().includes("gold") && s.change < 0)
    );

    if (risingSignal) {
      expect(risingSignal.changeDirection).toBe("up");
    }
    if (fallingSignal) {
      expect(fallingSignal.changeDirection).toBe("down");
    }
    // At least one directional signal should exist
    expect(risingSignal || fallingSignal).toBeTruthy();
  });
});

// ===========================================================================
// calculateMarketRiskScore
// ===========================================================================

describe("calculateMarketRiskScore", () => {
  it("returns 0 for empty signals array", () => {
    expect(calculateMarketRiskScore([])).toBe(0);
  });

  it("returns higher score with more critical signals", () => {
    const lowSignals = [makeSignal({ significance: "low" })];
    const criticalSignals = [
      makeSignal({ significance: "critical" }),
      makeSignal({ significance: "critical" }),
      makeSignal({ significance: "critical" }),
    ];
    const lowScore = calculateMarketRiskScore(lowSignals);
    const criticalScore = calculateMarketRiskScore(criticalSignals);
    expect(criticalScore).toBeGreaterThan(lowScore);
  });

  it("score is capped at 100", () => {
    const manySignals: MarketSignal[] = Array.from({ length: 20 }, (_, i) =>
      makeSignal({
        indicator: `Critical-${i}`,
        significance: "critical",
        value: 100,
        change: 10,
      })
    );
    const score = calculateMarketRiskScore(manySignals);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("single low signal returns low score", () => {
    const signals = [makeSignal({ significance: "low" })];
    const score = calculateMarketRiskScore(signals);
    expect(score).toBeLessThan(25);
  });

  it("mix of severities returns proportional score", () => {
    const mixed = [
      makeSignal({ significance: "critical" }),
      makeSignal({ significance: "low" }),
      makeSignal({ significance: "medium" }),
    ];
    const allLow = [
      makeSignal({ significance: "low" }),
      makeSignal({ significance: "low" }),
      makeSignal({ significance: "low" }),
    ];
    const allCritical = [
      makeSignal({ significance: "critical" }),
      makeSignal({ significance: "critical" }),
      makeSignal({ significance: "critical" }),
    ];
    const mixedScore = calculateMarketRiskScore(mixed);
    const lowScore = calculateMarketRiskScore(allLow);
    const criticalScore = calculateMarketRiskScore(allCritical);
    expect(mixedScore).toBeGreaterThan(lowScore);
    expect(mixedScore).toBeLessThan(criticalScore);
  });
});

// ===========================================================================
// scoreToRiskLevel
// ===========================================================================

describe("scoreToRiskLevel", () => {
  it('score >= 70 returns "critical"', () => {
    expect(scoreToRiskLevel(70)).toBe("critical");
    expect(scoreToRiskLevel(90)).toBe("critical");
    expect(scoreToRiskLevel(100)).toBe("critical");
  });

  it('score >= 45 returns "elevated"', () => {
    expect(scoreToRiskLevel(45)).toBe("elevated");
    expect(scoreToRiskLevel(55)).toBe("elevated");
    expect(scoreToRiskLevel(69)).toBe("elevated");
  });

  it('score >= 20 returns "moderate"', () => {
    expect(scoreToRiskLevel(20)).toBe("moderate");
    expect(scoreToRiskLevel(30)).toBe("moderate");
    expect(scoreToRiskLevel(44)).toBe("moderate");
  });

  it('score < 20 returns "low"', () => {
    expect(scoreToRiskLevel(0)).toBe("low");
    expect(scoreToRiskLevel(10)).toBe("low");
    expect(scoreToRiskLevel(19)).toBe("low");
  });
});
