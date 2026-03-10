import { describe, it, expect } from "vitest";
import {
  checkAgainstBaseline,
  detectTrendChange,
  decomposeTimeSeries,
  type BaselineMetric,
} from "../adaptive-baselines";

function makeMetric(overrides: Partial<BaselineMetric> = {}): BaselineMetric {
  return {
    field: "amount",
    domain: "finance",
    mean: 100,
    stdDev: 10,
    min: 70,
    max: 130,
    p5: 83.55,
    p95: 116.45,
    sampleSize: 100,
    lastUpdated: new Date(),
    trend: "STABLE",
    trendSlope: 0,
    ...overrides,
  };
}

describe("checkAgainstBaseline", () => {
  it("detects anomaly above threshold", () => {
    const metric = makeMetric({ mean: 100, stdDev: 10 });
    // Value 130 is 3 stddevs above mean, above 2.5 sensitivity
    const result = checkAgainstBaseline(130, metric, 2.5);

    expect(result.isAnomaly).toBe(true);
    expect(result.deviation).toBeCloseTo(3.0, 1);
    expect(result.direction).toBe("above");
  });

  it("returns normal for values within range", () => {
    const metric = makeMetric({ mean: 100, stdDev: 10 });
    // Value 105 is only 0.5 stddevs from mean
    const result = checkAgainstBaseline(105, metric, 2.5);

    expect(result.isAnomaly).toBe(false);
    expect(result.direction).toBe("normal");
    expect(result.deviation).toBeCloseTo(0.5, 1);
  });

  it("detects anomaly below threshold", () => {
    const metric = makeMetric({ mean: 100, stdDev: 10 });
    // Value 60 is 4 stddevs below mean
    const result = checkAgainstBaseline(60, metric, 2.5);

    expect(result.isAnomaly).toBe(true);
    expect(result.direction).toBe("below");
    expect(result.deviation).toBeCloseTo(4.0, 1);
  });

  it("handles zero stdDev edge case", () => {
    const metric = makeMetric({ mean: 50, stdDev: 0 });

    // Exact match
    const exact = checkAgainstBaseline(50, metric);
    expect(exact.isAnomaly).toBe(false);
    expect(exact.direction).toBe("normal");
    expect(exact.deviation).toBe(0);

    // Different value
    const diff = checkAgainstBaseline(51, metric);
    expect(diff.isAnomaly).toBe(true);
    expect(diff.deviation).toBe(Infinity);
    expect(diff.direction).toBe("above");
  });

  it("confidence increases with sample size", () => {
    const smallSample = makeMetric({ sampleSize: 5, mean: 100, stdDev: 10 });
    const largeSample = makeMetric({ sampleSize: 100, mean: 100, stdDev: 10 });

    const resultSmall = checkAgainstBaseline(105, smallSample, 2.5);
    const resultLarge = checkAgainstBaseline(105, largeSample, 2.5);

    // Large sample should have higher or equal confidence
    expect(resultLarge.confidence).toBeGreaterThanOrEqual(
      resultSmall.confidence
    );
  });
});

describe("detectTrendChange", () => {
  it("detects upward regime shift", () => {
    // First 30 values around 10, next 30 around 50
    const values = [
      ...Array.from({ length: 30 }, () => 10 + Math.random() * 2),
      ...Array.from({ length: 30 }, () => 50 + Math.random() * 2),
    ];

    const result = detectTrendChange(values, 10);

    expect(result.hasChanged).toBe(true);
    expect(result.changePoint).not.toBeNull();
    expect(result.changePoint!).toBeGreaterThan(10);
    expect(result.changePoint!).toBeLessThan(50);
    expect(result.currentMean).toBeGreaterThan(result.previousMean);
    expect(result.significance).toBeGreaterThan(60);
  });

  it("returns no change for stable data", () => {
    const values = Array.from({ length: 60 }, () => 100 + Math.random() * 0.1);

    const result = detectTrendChange(values, 10);

    expect(result.hasChanged).toBe(false);
    expect(result.changePoint).toBeNull();
    expect(result.significance).toBeLessThanOrEqual(60);
  });

  it("returns no change for insufficient data", () => {
    const values = [1, 2, 3];

    const result = detectTrendChange(values, 20);

    expect(result.hasChanged).toBe(false);
    expect(result.changePoint).toBeNull();
    expect(result.significance).toBe(0);
  });
});

describe("decomposeTimeSeries", () => {
  it("separates trend from seasonal component", () => {
    // Synthetic: linear trend (0.5 per step) + weekly seasonal pattern
    const values = [];
    const periodLen = 7;
    const seasonalPattern = [3, -2, 1, -1, 2, -3, 0]; // sums to 0

    for (let i = 0; i < 56; i++) {
      // 8 weeks of daily data
      const trendComponent = 10 + 0.5 * i;
      const seasonalComponent = seasonalPattern[i % periodLen];
      values.push({
        timestamp: new Date(Date.UTC(2026, 0, 1 + i)),
        value: trendComponent + seasonalComponent,
      });
    }

    const result = decomposeTimeSeries(values, "daily");

    expect(result.trend).toHaveLength(56);
    expect(result.seasonal).toHaveLength(56);
    expect(result.residual).toHaveLength(56);

    // Trend should be roughly increasing
    expect(result.trend[result.trend.length - 1]).toBeGreaterThan(
      result.trend[0]
    );

    // Seasonal should repeat with period 7
    // Check two corresponding buckets have similar seasonal values
    expect(result.seasonal[0]).toBeCloseTo(result.seasonal[7], 0);
    expect(result.seasonal[1]).toBeCloseTo(result.seasonal[8], 0);
  });

  it("residuals are small for synthetic data with known pattern", () => {
    // Pure trend + seasonal, no noise
    const values = [];
    const periodLen = 7;
    const seasonalPattern = [2, -1, 0, 1, -2, 3, -3];

    for (let i = 0; i < 42; i++) {
      values.push({
        timestamp: new Date(Date.UTC(2026, 0, 1 + i)),
        value: 50 + i * 0.3 + seasonalPattern[i % periodLen],
      });
    }

    const result = decomposeTimeSeries(values, "daily");

    // Residuals should be small relative to the data range
    const maxResidual = Math.max(...result.residual.map(Math.abs));
    expect(maxResidual).toBeLessThan(5);
  });

  it("handles empty input", () => {
    const result = decomposeTimeSeries([], "daily");

    expect(result.trend).toEqual([]);
    expect(result.seasonal).toEqual([]);
    expect(result.residual).toEqual([]);
  });

  it("handles very short series (fewer than 2 periods)", () => {
    const values = [
      { timestamp: new Date("2026-01-01"), value: 10 },
      { timestamp: new Date("2026-01-02"), value: 12 },
      { timestamp: new Date("2026-01-03"), value: 11 },
    ];

    const result = decomposeTimeSeries(values, "daily");

    // With < 2*periodLen data points, should return raw as trend
    expect(result.trend).toHaveLength(3);
    expect(result.seasonal.every((v) => v === 0)).toBe(true);
    expect(result.residual.every((v) => v === 0)).toBe(true);
  });
});
