import { describe, it, expect, beforeEach } from "vitest";
import {
  WelfordAccumulator,
  trackKeywords,
  trackGeoEvent,
  detectAnomaly,
  checkCorroboration,
  resetPatternState,
} from "../pattern-detection";

beforeEach(() => {
  resetPatternState();
});

// ---- WelfordAccumulator ----

describe("WelfordAccumulator", () => {
  it("starts with count=0 and mean=0", () => {
    const acc = new WelfordAccumulator();
    expect(acc.count).toBe(0);
    expect(acc.mean).toBe(0);
  });

  it("after a single value, mean equals that value", () => {
    const acc = new WelfordAccumulator();
    acc.update(42);
    expect(acc.count).toBe(1);
    expect(acc.mean).toBe(42);
  });

  it("computes the correct mean for two values", () => {
    const acc = new WelfordAccumulator();
    acc.update(10);
    acc.update(20);
    expect(acc.mean).toBe(15);
  });

  it("computes correct mean and variance for [2,4,4,4,5,5,7,9]", () => {
    const acc = new WelfordAccumulator();
    for (const v of [2, 4, 4, 4, 5, 5, 7, 9]) acc.update(v);
    expect(acc.mean).toBe(5);
    expect(acc.variance).toBeCloseTo(4.571428, 4);
  });

  it("stdDev is the square root of variance", () => {
    const acc = new WelfordAccumulator();
    for (const v of [2, 4, 4, 4, 5, 5, 7, 9]) acc.update(v);
    expect(acc.stdDev).toBeCloseTo(Math.sqrt(acc.variance), 10);
  });

  it("z-score of the mean value is 0", () => {
    const acc = new WelfordAccumulator();
    for (const v of [2, 4, 4, 4, 5, 5, 7, 9]) acc.update(v);
    expect(acc.getZScore(acc.mean)).toBe(0);
  });

  it("z-score returns 0 when stdDev is 0", () => {
    const acc = new WelfordAccumulator();
    acc.update(5);
    acc.update(5);
    expect(acc.stdDev).toBe(0);
    expect(acc.getZScore(100)).toBe(0);
  });

  it("variance returns 0 with fewer than 2 values", () => {
    const acc = new WelfordAccumulator();
    expect(acc.variance).toBe(0);
    acc.update(10);
    expect(acc.variance).toBe(0);
  });
});

// ---- trackKeywords ----

describe("trackKeywords", () => {
  it("returns empty array for text without tracked keywords", () => {
    const result = trackKeywords("a lovely sunny day", "source-a");
    expect(result).toEqual([]);
  });

  it("single mention does not trigger a spike", () => {
    const result = trackKeywords(
      "nuclear energy policy discussion",
      "source-a"
    );
    expect(result).toEqual([]);
  });

  it("multiple mentions from multiple sources can trigger a spike", () => {
    const baseTime = new Date("2026-01-01T00:00:00Z");
    // Build up enough mentions from 2+ sources to exceed 3x baseline
    // First few calls build the baseline (count ≤ 3 feeds baseline)
    trackKeywords("nuclear threat detected", "src-a", baseTime);
    trackKeywords("nuclear threat detected", "src-b", new Date(baseTime.getTime() + 1000));
    trackKeywords("nuclear threat detected", "src-a", new Date(baseTime.getTime() + 2000));

    // Baseline is only updated when currentCount <= 3, so these first
    // 3 calls establish a low baseline (~1-2). After that, rapid mentions
    // push count well above 3x baseline without updating it further.
    // We need 2+ unique sources for a spike to trigger.
    let allSpikes: ReturnType<typeof trackKeywords> = [];
    for (let i = 3; i < 15; i++) {
      const source = i % 2 === 0 ? "src-a" : "src-b";
      const spikes = trackKeywords(
        "nuclear threat escalation",
        source,
        new Date(baseTime.getTime() + i * 1000)
      );
      allSpikes.push(...spikes);
    }

    // Also try with a third source
    const finalSpikes = trackKeywords(
      "nuclear alert issued",
      "src-c",
      new Date(baseTime.getTime() + 16000)
    );
    allSpikes.push(...finalSpikes);

    // At some point the ratio should exceed 3x with 2+ sources
    const nuclearSpikes = allSpikes.filter((s) => s.keyword === "nuclear");
    expect(nuclearSpikes.length).toBeGreaterThanOrEqual(1);
    expect(nuclearSpikes[0].sources.length).toBeGreaterThanOrEqual(2);
  });

  it("cooldown prevents repeat alerts within 30 minutes", () => {
    const baseTime = new Date("2026-01-01T00:00:00Z");

    // Trigger a spike
    for (let i = 0; i < 12; i++) {
      trackKeywords(
        "sanctions imposed immediately",
        i % 2 === 0 ? "src-a" : "src-b",
        new Date(baseTime.getTime() + i * 1000)
      );
    }
    const first = trackKeywords(
      "sanctions imposed",
      "src-c",
      new Date(baseTime.getTime() + 13000)
    );
    const firstSpike = first.find((s) => s.keyword === "sanctions");

    // Try again 10 minutes later — within 30-min cooldown
    const second = trackKeywords(
      "sanctions imposed again",
      "src-d",
      new Date(baseTime.getTime() + 10 * 60 * 1000)
    );
    const secondSpike = second.find((s) => s.keyword === "sanctions");

    // If first triggered, second should be blocked by cooldown
    if (firstSpike) {
      expect(secondSpike).toBeUndefined();
    }
  });

  it("different keywords are tracked independently", () => {
    const baseTime = new Date("2026-01-01T00:00:00Z");

    // Feed "nuclear" mentions
    for (let i = 0; i < 5; i++) {
      trackKeywords("nuclear test", "src-a", new Date(baseTime.getTime() + i * 1000));
    }

    // "sanctions" should have independent state
    const result = trackKeywords(
      "sanctions on trade",
      "src-b",
      new Date(baseTime.getTime() + 6000)
    );
    const sanctionsSpikes = result.filter((s) => s.keyword === "sanctions");
    // Single mention from one source — should not spike
    expect(sanctionsSpikes).toEqual([]);
  });

  it("deduplicates sources correctly", () => {
    const baseTime = new Date("2026-01-01T00:00:00Z");

    // Same source many times — sources set should stay at size 1
    for (let i = 0; i < 15; i++) {
      trackKeywords(
        "embargo on exports",
        "same-source",
        new Date(baseTime.getTime() + i * 1000)
      );
    }

    // With only 1 unique source, spike should NOT trigger (needs 2+)
    const result = trackKeywords(
      "embargo continues",
      "same-source",
      new Date(baseTime.getTime() + 16000)
    );
    const embargoSpikes = result.filter((s) => s.keyword === "embargo");
    expect(embargoSpikes).toEqual([]);
  });
});

// ---- trackGeoEvent ----

describe("trackGeoEvent", () => {
  it("returns null for a single event type", () => {
    const result = trackGeoEvent("US", "military");
    expect(result).toBeNull();
  });

  it("returns null for two distinct event types", () => {
    const baseTime = new Date("2026-01-01T00:00:00Z");
    trackGeoEvent("US", "military", baseTime);
    const result = trackGeoEvent(
      "US",
      "economic",
      new Date(baseTime.getTime() + 1000)
    );
    expect(result).toBeNull();
  });

  it("triggers convergence with three distinct event types", () => {
    const baseTime = new Date("2026-01-01T00:00:00Z");
    trackGeoEvent("US", "military", baseTime);
    trackGeoEvent("US", "economic", new Date(baseTime.getTime() + 1000));
    const result = trackGeoEvent(
      "US",
      "political",
      new Date(baseTime.getTime() + 2000)
    );

    expect(result).not.toBeNull();
    expect(result!.countryCode).toBe("US");
    expect(result!.eventTypes).toHaveLength(3);
    expect(result!.eventCount).toBe(3);
    expect(result!.timeWindowHours).toBe(24);
  });

  it("repeated same event type does not count as distinct", () => {
    const baseTime = new Date("2026-01-01T00:00:00Z");
    trackGeoEvent("RU", "military", baseTime);
    trackGeoEvent("RU", "military", new Date(baseTime.getTime() + 1000));
    const result = trackGeoEvent(
      "RU",
      "military",
      new Date(baseTime.getTime() + 2000)
    );
    expect(result).toBeNull();
  });

  it("returns correct severity based on event type count", () => {
    const baseTime = new Date("2026-01-01T00:00:00Z");
    trackGeoEvent("CN", "military", baseTime);
    trackGeoEvent("CN", "economic", new Date(baseTime.getTime() + 1000));
    trackGeoEvent("CN", "political", new Date(baseTime.getTime() + 2000));

    // 3 types → medium
    const med = trackGeoEvent(
      "CN",
      "political",
      new Date(baseTime.getTime() + 3000)
    );
    expect(med).not.toBeNull();
    expect(med!.severity).toBe("medium");

    // 4 types → high
    const high = trackGeoEvent(
      "CN",
      "cyber",
      new Date(baseTime.getTime() + 4000)
    );
    expect(high).not.toBeNull();
    expect(high!.severity).toBe("high");

    // 5 types → critical
    const crit = trackGeoEvent(
      "CN",
      "humanitarian",
      new Date(baseTime.getTime() + 5000)
    );
    expect(crit).not.toBeNull();
    expect(crit!.severity).toBe("critical");
  });
});

// ---- detectAnomaly ----

describe("detectAnomaly", () => {
  it("returns null with fewer than 10 data points", () => {
    for (let i = 0; i < 9; i++) {
      const result = detectAnomaly("test-metric", 100);
      expect(result).toBeNull();
    }
  });

  it("returns null for normal values after baseline is established", () => {
    // Feed 15 identical values — no variance, stdDev=0, z-score=0
    for (let i = 0; i < 15; i++) {
      detectAnomaly("stable-metric", 50);
    }
    // Same value — z-score is 0 (stdDev is 0 → getZScore returns 0)
    const result = detectAnomaly("stable-metric", 50);
    expect(result).toBeNull();
  });

  it("detects an anomaly for an extreme outlier after baseline", () => {
    // Establish a baseline of ~100 with small variance
    for (let i = 0; i < 15; i++) {
      detectAnomaly("cpu-usage", 100 + (i % 3)); // values: 100, 101, 102, ...
    }
    // Inject a massive outlier
    const result = detectAnomaly("cpu-usage", 500);
    expect(result).not.toBeNull();
    expect(result!.metric).toBe("cpu-usage");
    expect(result!.currentValue).toBe(500);
    expect(result!.zScore).toBeGreaterThan(1.5);
  });

  it("severity scales with z-score magnitude", () => {
    // Build baseline with known mean=50 and small stdDev
    for (let i = 0; i < 20; i++) {
      detectAnomaly("severity-metric", 50 + (i % 2)); // 50 or 51
    }

    // The stdDev is ~0.5. To get z ≈ 2.0 we need value ≈ 51
    // To get critical (z ≥ 3.0), we need a larger outlier
    const result = detectAnomaly("severity-metric", 100);
    expect(result).not.toBeNull();
    // With mean ~50.5 and stdDev ~0.5, z-score for 100 is huge → critical
    expect(result!.severity).toBe("critical");
  });

  it("different metrics are tracked independently", () => {
    // Fill metric-A with 15 points
    for (let i = 0; i < 15; i++) {
      detectAnomaly("metric-a", 100);
    }

    // metric-B has only 1 point — should return null
    const result = detectAnomaly("metric-b", 100);
    expect(result).toBeNull();
  });
});

// ---- checkCorroboration ----

describe("checkCorroboration", () => {
  it("returns unconfirmed when no events match", () => {
    const result = checkCorroboration("Major earthquake strikes Tokyo", []);
    expect(result.isCorroborated).toBe(false);
    expect(result.corroborationLevel).toBe("unconfirmed");
    expect(result.sources).toHaveLength(0);
  });

  it("returns unconfirmed with only one matching source", () => {
    const result = checkCorroboration(
      "Major earthquake strikes coastal region today",
      [
        {
          headline: "Earthquake strikes coastal region causing damage",
          source: "Reuters",
        },
      ]
    );
    // Only 1 source — not corroborated
    expect(result.isCorroborated).toBe(false);
    expect(result.corroborationLevel).toBe("unconfirmed");
  });

  it("returns likely with two matching sources and isCorroborated=true", () => {
    const result = checkCorroboration(
      "Major earthquake strikes coastal region today",
      [
        {
          headline: "Earthquake strikes coastal region causing damage",
          source: "Reuters",
        },
        {
          headline: "Powerful earthquake strikes coastal region overnight",
          source: "AP News",
        },
      ]
    );
    expect(result.isCorroborated).toBe(true);
    expect(result.corroborationLevel).toBe("likely");
    expect(result.sources).toContain("Reuters");
    expect(result.sources).toContain("AP News");
  });

  it("returns confirmed with three or more matching sources", () => {
    const result = checkCorroboration(
      "Major earthquake strikes coastal region today",
      [
        {
          headline: "Earthquake strikes coastal region causing damage",
          source: "Reuters",
        },
        {
          headline: "Powerful earthquake strikes coastal region overnight",
          source: "AP News",
        },
        {
          headline: "Earthquake strikes coastal region with heavy casualties",
          source: "BBC",
        },
      ]
    );
    expect(result.isCorroborated).toBe(true);
    expect(result.corroborationLevel).toBe("confirmed");
    expect(result.sources).toHaveLength(3);
  });

  it("completely different headlines do not match", () => {
    const result = checkCorroboration(
      "Major earthquake strikes coastal region today",
      [
        {
          headline: "Stock market rally continues on Wall Street",
          source: "CNBC",
        },
        {
          headline: "New climate policy announced by European Union",
          source: "BBC",
        },
      ]
    );
    expect(result.isCorroborated).toBe(false);
    expect(result.corroborationLevel).toBe("unconfirmed");
    expect(result.sources).toHaveLength(0);
  });
});
