import { describe, it, expect } from "vitest";
import {
  WelfordAccumulator,
  detectZScoreAnomalies,
  detectIQRAnomalies,
  IsolationForest,
  detectTemporalAnomalies,
  detectBehavioralAnomalies,
} from "../anomaly-detection";

describe("WelfordAccumulator", () => {
  it("computes correct mean, variance, stdDev for known dataset", () => {
    const acc = new WelfordAccumulator();
    const data = [2, 4, 4, 4, 5, 5, 7, 9];
    for (const v of data) acc.add(v);

    expect(acc.getMean()).toBe(5);
    expect(acc.getCount()).toBe(8);
    // Population variance = 4, sample variance = 32/7 ~ 4.571
    expect(acc.getVariance()).toBeCloseTo(4.571, 2);
    expect(acc.getStdDev()).toBeCloseTo(Math.sqrt(32 / 7), 4);
  });

  it("handles single value", () => {
    const acc = new WelfordAccumulator();
    acc.add(42);

    expect(acc.getMean()).toBe(42);
    expect(acc.getVariance()).toBe(0);
    expect(acc.getStdDev()).toBe(0);
    expect(acc.getCount()).toBe(1);
  });

  it("handles identical values (zero variance)", () => {
    const acc = new WelfordAccumulator();
    for (let i = 0; i < 100; i++) acc.add(7);

    expect(acc.getMean()).toBe(7);
    expect(acc.getVariance()).toBe(0);
    expect(acc.getStdDev()).toBe(0);
  });
});

describe("detectZScoreAnomalies", () => {
  it("detects obvious outliers in normal distribution", () => {
    // 100 values around mean=50, stddev~5, plus one extreme outlier
    const values = Array.from({ length: 100 }, (_, i) => 50 + (i % 10) - 5);
    values.push(200); // extreme outlier

    const results = detectZScoreAnomalies(values, 2.5);

    const anomalies = results.filter((r) => r.isAnomaly);
    expect(anomalies.length).toBeGreaterThanOrEqual(1);
    // The outlier at index 100 should be flagged
    const outlierResult = results[100];
    expect(outlierResult.isAnomaly).toBe(true);
    expect(outlierResult.zScore).toBeGreaterThan(2.5);
  });

  it("no false positives on uniform data", () => {
    // Tightly clustered data: all values identical
    const values = new Array(50).fill(10);
    const results = detectZScoreAnomalies(values);

    const anomalies = results.filter((r) => r.isAnomaly);
    expect(anomalies.length).toBe(0);
  });

  it("respects custom threshold", () => {
    const values = [10, 10, 10, 10, 10, 10, 10, 10, 10, 25];

    const looseResults = detectZScoreAnomalies(values, 5.0);
    const strictResults = detectZScoreAnomalies(values, 1.0);

    const looseAnomalies = looseResults.filter((r) => r.isAnomaly);
    const strictAnomalies = strictResults.filter((r) => r.isAnomaly);

    // Stricter threshold should find at least as many anomalies
    expect(strictAnomalies.length).toBeGreaterThanOrEqual(
      looseAnomalies.length
    );
  });
});

describe("detectIQRAnomalies", () => {
  it("detects upper and lower outliers", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100, -50];

    const results = detectIQRAnomalies(values);
    const anomalies = results.filter((r) => r.isAnomaly);

    expect(anomalies.length).toBeGreaterThanOrEqual(2);
    // 100 should be upper outlier
    const upper = results.find((r) => r.value === 100);
    expect(upper?.isAnomaly).toBe(true);
    expect(upper?.bound).toBe("upper");
    // -50 should be lower outlier
    const lower = results.find((r) => r.value === -50);
    expect(lower?.isAnomaly).toBe(true);
    expect(lower?.bound).toBe("lower");
  });

  it("handles small datasets gracefully", () => {
    const values = [5, 10];
    const results = detectIQRAnomalies(values);

    expect(results).toHaveLength(2);
    // Should not crash
    for (const r of results) {
      expect(typeof r.isAnomaly).toBe("boolean");
    }
  });
});

describe("IsolationForest", () => {
  it("scores obvious outliers higher than normal points", () => {
    // Normal cluster around (50, 50)
    const data: number[][] = [];
    for (let i = 0; i < 200; i++) {
      data.push([50 + (Math.random() - 0.5) * 4, 50 + (Math.random() - 0.5) * 4]);
    }
    // Add clear outlier
    data.push([200, 200]);

    const forest = new IsolationForest({ numTrees: 50, sampleSize: 100 });
    forest.fit(data);

    const normalScore = forest.predict([50, 50]);
    const outlierScore = forest.predict([200, 200]);

    expect(outlierScore).toBeGreaterThan(normalScore);
  });

  it("handles multi-dimensional data", () => {
    const data: number[][] = [];
    for (let i = 0; i < 100; i++) {
      data.push([i, i * 2, i * 3, Math.random()]);
    }

    const forest = new IsolationForest({ numTrees: 20 });
    forest.fit(data);

    const score = forest.predict([50, 100, 150, 0.5]);
    expect(typeof score).toBe("number");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("predictBatch returns anomaly flags", () => {
    const data: number[][] = [];
    for (let i = 0; i < 100; i++) {
      data.push([50 + (Math.random() - 0.5) * 2]);
    }

    const forest = new IsolationForest({ numTrees: 30, sampleSize: 50 });
    forest.fit(data);

    const testPoints = [[50], [50.5], [999]];
    const batch = forest.predictBatch(testPoints);

    expect(batch).toHaveLength(3);
    for (const result of batch) {
      expect(typeof result.index).toBe("number");
      expect(typeof result.score).toBe("number");
      expect(typeof result.isAnomaly).toBe("boolean");
    }
    // isAnomaly is score > 0.6
    for (const result of batch) {
      expect(result.isAnomaly).toBe(result.score > 0.6);
    }
  });
});

describe("detectTemporalAnomalies", () => {
  it("flags off-hours activity", () => {
    // All events during business hours except one at 3 AM
    const events = [];
    for (let i = 0; i < 20; i++) {
      const ts = new Date("2026-03-01T10:00:00Z");
      ts.setUTCHours(9 + (i % 8)); // 9-16 UTC
      events.push({ timestamp: ts });
    }
    // Add off-hours event at 3 AM
    events.push({ timestamp: new Date("2026-03-01T03:00:00Z") });

    const result = detectTemporalAnomalies(events);

    const offHoursAnomaly = result.anomalies.find((a) =>
      a.reason.includes("outside business hours")
    );
    expect(offHoursAnomaly).toBeDefined();
    expect(offHoursAnomaly!.score).toBeGreaterThan(0);
  });

  it("flags weekend activity", () => {
    // Weekday events
    const events = [];
    for (let i = 0; i < 20; i++) {
      // 2026-03-02 is Monday
      events.push({ timestamp: new Date("2026-03-02T10:00:00Z") });
    }
    // Saturday event
    events.push({ timestamp: new Date("2026-03-07T10:00:00Z") });

    const result = detectTemporalAnomalies(events);

    const weekendAnomaly = result.anomalies.find((a) =>
      a.reason.includes("Weekend activity")
    );
    expect(weekendAnomaly).toBeDefined();
    expect(weekendAnomaly!.reason).toContain("Saturday");
  });
});

describe("detectBehavioralAnomalies", () => {
  it("detects volume spikes", () => {
    const activities = [];
    // 2 actions per day for 5 days (avg = ~6.7 including spike day)
    for (let day = 1; day <= 5; day++) {
      for (let i = 0; i < 2; i++) {
        activities.push({
          userId: "user-1",
          timestamp: new Date(`2026-03-0${day}T10:00:00Z`),
          action: "view",
        });
      }
    }
    // Spike: 30 actions on day 6 (well above 3x average)
    for (let i = 0; i < 30; i++) {
      activities.push({
        userId: "user-1",
        timestamp: new Date("2026-03-06T10:00:00Z"),
        action: "view",
      });
    }

    const result = detectBehavioralAnomalies(activities);
    const spike = result.anomalies.find((a) => a.type === "VOLUME_SPIKE");

    expect(spike).toBeDefined();
    expect(spike!.score).toBeGreaterThan(0);
    expect(spike!.description).toContain("above daily average");
  });

  it("detects unusual hours", () => {
    const activities = [];
    // Mix of normal hours and off-hours
    for (let i = 0; i < 10; i++) {
      activities.push({
        userId: "user-2",
        timestamp: new Date(`2026-03-01T10:00:00Z`),
        action: "view",
      });
    }
    // 5 actions at 2 AM (off-hours) = 5/15 = 33%
    for (let i = 0; i < 5; i++) {
      activities.push({
        userId: "user-2",
        timestamp: new Date(`2026-03-01T02:00:00Z`),
        action: "view",
      });
    }

    const result = detectBehavioralAnomalies(activities, {
      typicalActionsPerDay: 10,
      typicalHours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
      typicalResources: [],
    });

    const unusual = result.anomalies.find((a) => a.type === "UNUSUAL_HOURS");
    expect(unusual).toBeDefined();
    expect(unusual!.description).toContain("outside typical hours");
  });

  it("returns empty anomalies for empty input", () => {
    const result = detectBehavioralAnomalies([]);
    expect(result.anomalies).toEqual([]);
  });
});
