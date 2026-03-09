import { describe, it, expect } from "vitest";
import { detectSensitiveContent, parseBiasResult } from "../bias-detector";

describe("Bias Detector", () => {
  // ---- Sensitive Content Detection ----
  describe("detectSensitiveContent", () => {
    it("detects Taiwan as sensitive region", () => {
      const result = detectSensitiveContent(
        "China conducts military drills near Taiwan",
        "The Chinese military conducted large-scale exercises in the Taiwan Strait.",
      );
      expect(result.sensitiveRegion).toBe(true);
    });

    it("detects Kashmir as sensitive region", () => {
      const result = detectSensitiveContent(
        "Tensions rise in Kashmir",
        "Cross-border shelling reported in the disputed Kashmir region.",
      );
      expect(result.sensitiveRegion).toBe(true);
    });

    it("detects Palestine/Israel as sensitive", () => {
      const result = detectSensitiveContent(
        "Gaza conflict escalates",
        "Fighting intensifies in the Palestine-Israel border region.",
      );
      expect(result.sensitiveRegion).toBe(true);
    });

    it("detects Crimea as sensitive region", () => {
      const result = detectSensitiveContent(
        "Crimea bridge incident",
        "An explosion damaged the bridge connecting Crimea to Russia.",
      );
      expect(result.sensitiveRegion).toBe(true);
    });

    it("detects sovereignty as sensitive topic", () => {
      const result = detectSensitiveContent(
        "Sovereignty dispute in South China Sea",
        "Multiple nations claim sovereignty over islands.",
      );
      expect(result.sensitiveTopic).toBe(true);
    });

    it("detects human rights as sensitive topic", () => {
      const result = detectSensitiveContent(
        "Human rights report released",
        "Report documents human rights violations in the region.",
      );
      expect(result.sensitiveTopic).toBe(true);
    });

    it("detects election interference as sensitive", () => {
      const result = detectSensitiveContent(
        "Election fraud allegations",
        "Multiple parties allege election fraud in the recent vote.",
      );
      expect(result.sensitiveTopic).toBe(true);
    });

    it("returns false for non-sensitive content", () => {
      const result = detectSensitiveContent(
        "New trade agreement signed",
        "The EU and Japan signed a comprehensive trade agreement.",
      );
      expect(result.sensitiveRegion).toBe(false);
      expect(result.sensitiveTopic).toBe(false);
    });

    it("handles region parameter", () => {
      const result = detectSensitiveContent(
        "Military exercises",
        "Routine exercises conducted.",
        "Taiwan"
      );
      expect(result.sensitiveRegion).toBe(true);
    });

    it("is case-insensitive", () => {
      const result = detectSensitiveContent(
        "TAIWAN STRAIT TENSIONS",
        "MILITARY BUILDUP NEAR TAIWAN",
      );
      expect(result.sensitiveRegion).toBe(true);
    });
  });

  // ---- Bias Result Parsing ----
  describe("parseBiasResult", () => {
    it("parses valid JSON result", () => {
      const raw = JSON.stringify({
        hasBias: true,
        confidence: 0.75,
        biasType: "framing",
        explanation: "The article frames the event from one side.",
        alternativeFraming: "A more balanced framing would include both perspectives.",
        recommendation: "flag",
      });

      const result = parseBiasResult(raw, true, false);

      expect(result.hasBias).toBe(true);
      expect(result.confidence).toBe(0.75);
      expect(result.biasType).toBe("framing");
      expect(result.recommendation).toBe("flag");
      expect(result.sensitiveRegion).toBe(true);
      expect(result.sensitiveTopic).toBe(false);
    });

    it("normalizes confidence to 0-1 range", () => {
      const raw = JSON.stringify({
        hasBias: false,
        confidence: 2.5,
        biasType: null,
        explanation: "No bias detected.",
        alternativeFraming: null,
        recommendation: "accept",
      });

      const result = parseBiasResult(raw, false, false);
      expect(result.confidence).toBe(1);
    });

    it("handles negative confidence", () => {
      const raw = JSON.stringify({
        hasBias: false,
        confidence: -0.5,
        biasType: null,
        explanation: "No bias.",
        alternativeFraming: null,
        recommendation: "accept",
      });

      const result = parseBiasResult(raw, false, false);
      expect(result.confidence).toBe(0);
    });

    it("defaults invalid bias type to null", () => {
      const raw = JSON.stringify({
        hasBias: true,
        confidence: 0.5,
        biasType: "invalid_type",
        explanation: "Some bias.",
        alternativeFraming: null,
        recommendation: "flag",
      });

      const result = parseBiasResult(raw, false, false);
      expect(result.biasType).toBeNull();
    });

    it("accepts all valid bias types", () => {
      for (const biasType of ["omission", "framing", "emphasis", "attribution"]) {
        const raw = JSON.stringify({
          hasBias: true,
          confidence: 0.5,
          biasType,
          explanation: "Test.",
          alternativeFraming: null,
          recommendation: "flag",
        });

        const result = parseBiasResult(raw, false, false);
        expect(result.biasType).toBe(biasType);
      }
    });

    it("defaults invalid recommendation to flag", () => {
      const raw = JSON.stringify({
        hasBias: false,
        confidence: 0,
        biasType: null,
        explanation: "Test.",
        alternativeFraming: null,
        recommendation: "invalid",
      });

      const result = parseBiasResult(raw, false, false);
      expect(result.recommendation).toBe("flag");
    });
  });
});
