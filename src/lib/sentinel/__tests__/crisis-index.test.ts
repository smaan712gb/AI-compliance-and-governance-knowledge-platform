import { describe, it, expect } from "vitest";
import {
  calculateCrisisScore,
  calculateComponents,
  calculateEventScore,
  calculateBoosts,
  calculateTrend,
  scoreToLevel,
  getBaselineScore,
  getProximityToConflictZones,
  calculateBatchCrisisScores,
} from "../crisis-index";
import type { CrisisIndicators } from "../types";

describe("Crisis Index Calculator", () => {
  // ---- Baseline Scores ----
  describe("getBaselineScore", () => {
    it("returns correct baseline for known countries", () => {
      expect(getBaselineScore("UA")).toBe(75);
      expect(getBaselineScore("US")).toBe(15);
      expect(getBaselineScore("CH")).toBe(5);
      expect(getBaselineScore("SY")).toBe(70);
    });

    it("returns default for unknown countries", () => {
      expect(getBaselineScore("XX")).toBe(20);
      expect(getBaselineScore("ZZ")).toBe(20);
    });

    it("is case-insensitive", () => {
      expect(getBaselineScore("ua")).toBe(75);
      expect(getBaselineScore("Us")).toBe(15);
    });
  });

  // ---- Components ----
  describe("calculateComponents", () => {
    it("calculates deadliness from fatality rate", () => {
      const indicators: CrisisIndicators = {
        conflictEvents: 10,
        fatalities: 100,
        protestEvents: 0,
        militaryActivity: 0,
        internetOutages: 0,
        newsVelocity: 0,
      };
      const components = calculateComponents(indicators);
      // 100/10 = 10 fatalities per event → score 100
      expect(components.deadliness).toBe(100);
    });

    it("caps deadliness at 100", () => {
      const indicators: CrisisIndicators = {
        conflictEvents: 5,
        fatalities: 500,
        protestEvents: 0,
        militaryActivity: 0,
        internetOutages: 0,
        newsVelocity: 0,
      };
      const components = calculateComponents(indicators);
      expect(components.deadliness).toBe(100);
    });

    it("handles zero conflict events without error", () => {
      const indicators: CrisisIndicators = {
        conflictEvents: 0,
        fatalities: 0,
        protestEvents: 5,
        militaryActivity: 0,
        internetOutages: 0,
        newsVelocity: 0,
      };
      const components = calculateComponents(indicators);
      expect(components.deadliness).toBe(0);
    });

    it("calculates civilian danger from protest ratio", () => {
      const indicators: CrisisIndicators = {
        conflictEvents: 10,
        fatalities: 0,
        protestEvents: 10, // 50% → score 100
        militaryActivity: 0,
        internetOutages: 0,
        newsVelocity: 0,
      };
      const components = calculateComponents(indicators);
      expect(components.civilianDanger).toBe(100);
    });

    it("calculates diffusion from event count", () => {
      const indicators: CrisisIndicators = {
        conflictEvents: 20,
        fatalities: 0,
        protestEvents: 0,
        militaryActivity: 0,
        internetOutages: 0,
        newsVelocity: 0,
      };
      const components = calculateComponents(indicators);
      expect(components.diffusion).toBe(100);
    });

    it("calculates fragmentation from military activity", () => {
      const indicators: CrisisIndicators = {
        conflictEvents: 0,
        fatalities: 0,
        protestEvents: 0,
        militaryActivity: 10,
        internetOutages: 0,
        newsVelocity: 0,
      };
      const components = calculateComponents(indicators);
      expect(components.fragmentation).toBe(100);
    });
  });

  // ---- Event Score ----
  describe("calculateEventScore", () => {
    it("averages 4 components equally", () => {
      const score = calculateEventScore({
        deadliness: 100,
        civilianDanger: 100,
        diffusion: 100,
        fragmentation: 100,
      });
      expect(score).toBe(100);
    });

    it("returns 0 for all-zero components", () => {
      const score = calculateEventScore({
        deadliness: 0,
        civilianDanger: 0,
        diffusion: 0,
        fragmentation: 0,
      });
      expect(score).toBe(0);
    });

    it("correctly weights mixed components", () => {
      const score = calculateEventScore({
        deadliness: 40,
        civilianDanger: 60,
        diffusion: 80,
        fragmentation: 20,
      });
      expect(score).toBe(50); // (40+60+80+20) / 4
    });
  });

  // ---- Boosts ----
  describe("calculateBoosts", () => {
    it("adds boost for internet outages (+5 each, max 20)", () => {
      const boost = calculateBoosts({
        conflictEvents: 0,
        fatalities: 0,
        protestEvents: 0,
        militaryActivity: 0,
        internetOutages: 3,
        newsVelocity: 0,
      });
      expect(boost).toBe(15);
    });

    it("caps internet outage boost at 20", () => {
      const boost = calculateBoosts({
        conflictEvents: 0,
        fatalities: 0,
        protestEvents: 0,
        militaryActivity: 0,
        internetOutages: 10,
        newsVelocity: 0,
      });
      expect(boost).toBe(20);
    });

    it("adds news velocity boost", () => {
      const boost = calculateBoosts({
        conflictEvents: 0,
        fatalities: 0,
        protestEvents: 0,
        militaryActivity: 0,
        internetOutages: 0,
        newsVelocity: 110,
      });
      expect(boost).toBe(10);
    });

    it("caps total boosts at 30", () => {
      const boost = calculateBoosts({
        conflictEvents: 0,
        fatalities: 0,
        protestEvents: 60,
        militaryActivity: 25,
        internetOutages: 5,
        newsVelocity: 110,
      });
      expect(boost).toBeLessThanOrEqual(30);
    });

    it("returns 0 for no boost indicators", () => {
      const boost = calculateBoosts({
        conflictEvents: 10,
        fatalities: 50,
        protestEvents: 0,
        militaryActivity: 0,
        internetOutages: 0,
        newsVelocity: 0,
      });
      expect(boost).toBe(0);
    });
  });

  // ---- Score to Level ----
  describe("scoreToLevel", () => {
    it("maps scores to correct levels", () => {
      expect(scoreToLevel(95)).toBe("critical");
      expect(scoreToLevel(80)).toBe("critical");
      expect(scoreToLevel(79)).toBe("severe");
      expect(scoreToLevel(60)).toBe("severe");
      expect(scoreToLevel(59)).toBe("elevated");
      expect(scoreToLevel(40)).toBe("elevated");
      expect(scoreToLevel(39)).toBe("guarded");
      expect(scoreToLevel(20)).toBe("guarded");
      expect(scoreToLevel(19)).toBe("low");
      expect(scoreToLevel(0)).toBe("low");
    });
  });

  // ---- Trend ----
  describe("calculateTrend", () => {
    it("detects escalating trend", () => {
      const scores = [30, 35, 40, 50, 55, 60, 70];
      expect(calculateTrend(scores)).toBe("escalating");
    });

    it("detects improving trend", () => {
      const scores = [70, 65, 60, 50, 45, 40, 30];
      expect(calculateTrend(scores)).toBe("improving");
    });

    it("detects stable trend", () => {
      const scores = [50, 51, 50, 49, 50, 51, 50];
      expect(calculateTrend(scores)).toBe("stable");
    });

    it("returns stable for single data point", () => {
      expect(calculateTrend([50])).toBe("stable");
    });

    it("returns stable for empty array", () => {
      expect(calculateTrend([])).toBe("stable");
    });
  });

  // ---- Full Crisis Score ----
  describe("calculateCrisisScore", () => {
    it("produces valid score for high-conflict country", () => {
      const score = calculateCrisisScore("UA", {
        conflictEvents: 45,
        fatalities: 120,
        protestEvents: 8,
        militaryActivity: 30,
        internetOutages: 3,
        newsVelocity: 85,
      });

      expect(score.countryCode).toBe("UA");
      expect(score.countryName).toBe("Ukraine");
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(100);
      expect(["critical", "severe", "elevated", "guarded", "low"]).toContain(score.level);
      expect(["escalating", "stable", "improving"]).toContain(score.trend);
      expect(score.components).toBeDefined();
      expect(score.indicators).toBeDefined();
    });

    it("produces low score for peaceful country", () => {
      const score = calculateCrisisScore("CH", {
        conflictEvents: 0,
        fatalities: 0,
        protestEvents: 1,
        militaryActivity: 0,
        internetOutages: 0,
        newsVelocity: 5,
      });

      expect(score.score).toBeLessThan(20);
      expect(score.level).toBe("low");
    });

    it("score is always between 0 and 100", () => {
      const extremeHigh = calculateCrisisScore("UA", {
        conflictEvents: 100,
        fatalities: 1000,
        protestEvents: 100,
        militaryActivity: 100,
        internetOutages: 20,
        newsVelocity: 200,
      });
      expect(extremeHigh.score).toBeLessThanOrEqual(100);

      const extremeLow = calculateCrisisScore("CH", {
        conflictEvents: 0,
        fatalities: 0,
        protestEvents: 0,
        militaryActivity: 0,
        internetOutages: 0,
        newsVelocity: 0,
      });
      expect(extremeLow.score).toBeGreaterThanOrEqual(0);
    });
  });

  // ---- Proximity ----
  describe("getProximityToConflictZones", () => {
    it("detects proximity to Ukraine conflict zone", () => {
      const result = getProximityToConflictZones(48.5, 37.5);
      expect(result).not.toBeNull();
      expect(result!.nearest).toBe("Ukraine-Russia");
    });

    it("returns null for locations far from conflict zones", () => {
      // New Zealand
      const result = getProximityToConflictZones(-41.3, 174.8);
      expect(result).toBeNull();
    });
  });

  // ---- Batch ----
  describe("calculateBatchCrisisScores", () => {
    it("calculates scores for multiple countries", () => {
      const data = [
        {
          countryCode: "UA",
          indicators: { conflictEvents: 45, fatalities: 120, protestEvents: 8, militaryActivity: 30, internetOutages: 3, newsVelocity: 85 },
        },
        {
          countryCode: "CH",
          indicators: { conflictEvents: 0, fatalities: 0, protestEvents: 1, militaryActivity: 0, internetOutages: 0, newsVelocity: 5 },
        },
      ];

      const scores = calculateBatchCrisisScores(data);
      expect(scores).toHaveLength(2);
      expect(scores[0].countryCode).toBe("UA");
      expect(scores[1].countryCode).toBe("CH");
      expect(scores[0].score).toBeGreaterThan(scores[1].score);
    });
  });
});
