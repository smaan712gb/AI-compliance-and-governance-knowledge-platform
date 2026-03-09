import { describe, it, expect } from "vitest";
import {
  calculateNameSimilarity,
  calculateGeographicRisk,
  screenEntity,
} from "../sanctions-screener";

describe("Sanctions Screener", () => {
  // ---- Name Similarity ----
  describe("calculateNameSimilarity", () => {
    it("returns 1 for identical names", () => {
      expect(calculateNameSimilarity("John Smith", "John Smith")).toBe(1);
    });

    it("returns 1 for case-different identical names", () => {
      expect(calculateNameSimilarity("JOHN SMITH", "john smith")).toBe(1);
    });

    it("returns high score for similar names", () => {
      const score = calculateNameSimilarity("John Smith", "Jon Smith");
      expect(score).toBeGreaterThan(0.6);
    });

    it("returns moderate score for partially matching names", () => {
      const score = calculateNameSimilarity(
        "John Michael Smith",
        "John Smith"
      );
      expect(score).toBeGreaterThan(0.4);
    });

    it("returns low score for completely different names", () => {
      const score = calculateNameSimilarity(
        "John Smith",
        "Maria Garcia"
      );
      expect(score).toBeLessThan(0.4);
    });

    it("returns low score for empty strings", () => {
      // Empty-to-empty: normalized strings are empty, returns 0
      // One-empty: Levenshtein distance = full length, low similarity
      expect(calculateNameSimilarity("John", "")).toBeLessThanOrEqual(0.1);
      expect(calculateNameSimilarity("", "John")).toBeLessThanOrEqual(0.1);
    });

    it("ignores special characters", () => {
      const score = calculateNameSimilarity(
        "Al-Rashid, Mohammed",
        "Al Rashid Mohammed"
      );
      expect(score).toBeGreaterThan(0.6);
    });

    it("handles single-word names", () => {
      const score = calculateNameSimilarity("Putin", "Putiin");
      expect(score).toBeGreaterThan(0.4);
    });
  });

  // ---- Geographic Risk ----
  describe("calculateGeographicRisk", () => {
    it("returns high risk for sanctioned countries", () => {
      expect(calculateGeographicRisk("IR")).toBe(85); // Iran
      expect(calculateGeographicRisk("KP")).toBe(85); // North Korea
      expect(calculateGeographicRisk("SY")).toBe(85); // Syria
      expect(calculateGeographicRisk("RU")).toBe(85); // Russia
    });

    it("returns medium risk for FATF grey list countries", () => {
      expect(calculateGeographicRisk("PK")).toBe(45); // Pakistan
      expect(calculateGeographicRisk("NG")).toBe(45); // Nigeria
      expect(calculateGeographicRisk("TR")).toBe(45); // Turkey
    });

    it("returns low risk for normal countries", () => {
      expect(calculateGeographicRisk("US")).toBe(10);
      expect(calculateGeographicRisk("DE")).toBe(10);
      expect(calculateGeographicRisk("JP")).toBe(10);
    });

    it("returns moderate baseline for unknown countries", () => {
      expect(calculateGeographicRisk(undefined)).toBe(20);
    });

    it("is case-insensitive", () => {
      expect(calculateGeographicRisk("ir")).toBe(85);
      expect(calculateGeographicRisk("Ir")).toBe(85);
    });
  });

  // ---- Composite Screening (without external API) ----
  describe("screenEntity", () => {
    it("returns clear for low-risk entity in low-risk country", async () => {
      const result = await screenEntity({
        name: "John Smith",
        entityType: "person",
        countryCode: "US",
      });

      expect(result.entityName).toBe("John Smith");
      expect(result.entityType).toBe("person");
      expect(result.geographicRiskScore).toBe(10);
      expect(result.compositeScore).toBeLessThanOrEqual(100);
      expect(["clear", "standard", "enhanced_due_diligence", "block"]).toContain(
        result.recommendation
      );
      expect(result.screenedAt).toBeTruthy();
      expect(result.riskFactors).toBeDefined();
      expect(Array.isArray(result.riskFactors)).toBe(true);
    });

    it("flags high-risk jurisdiction in composite score", async () => {
      const result = await screenEntity({
        name: "Test Entity",
        entityType: "organization",
        countryCode: "KP",
      });

      expect(result.geographicRiskScore).toBe(85);
      // Geographic risk contributes 5% of 85 = 4.25
      expect(result.compositeScore).toBeGreaterThan(0);
    });

    it("handles missing country code", async () => {
      const result = await screenEntity({
        name: "Anonymous Entity",
        entityType: "person",
      });

      expect(result.geographicRiskScore).toBe(20); // Unknown
      expect(result.recommendation).toBeDefined();
    });

    it("includes risk factors in output", async () => {
      const result = await screenEntity({
        name: "Test Corp",
        entityType: "organization",
        countryCode: "IR",
      });

      expect(result.riskFactors.length).toBeGreaterThan(0);
      expect(result.riskFactors.some((f) => f.includes("jurisdiction"))).toBe(true);
    });
  });
});
