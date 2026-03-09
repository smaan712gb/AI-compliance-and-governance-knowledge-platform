import { describe, it, expect } from "vitest";
import { parseReasoningResponse } from "../reasoning";

describe("Reasoning Engine", () => {
  describe("parseReasoningResponse", () => {
    it("parses valid JSON response", () => {
      const raw = JSON.stringify({
        category: "CONFLICT",
        severity: "high",
        riskScore: 75,
        reasoning: {
          whatHappened: "Military forces deployed to border region.",
          whyItMatters: "Escalation risk in geopolitically sensitive area.",
          whatHappensNext: "Potential for armed confrontation within days.",
          whoIsAffected: "Civilian population and neighboring countries.",
        },
        impactAnalysis: {
          primaryImpact: "Regional destabilization",
          secondOrderEffects: ["Refugee flows", "Market volatility"],
          affectedSectors: ["Energy", "Defense"],
          affectedCountries: ["UA", "PL", "DE"],
        },
        actionableInsights: [
          "Monitor troop movements",
          "Review supply chain exposure",
        ],
        entities: ["NATO", "Russian Federation"],
      });

      const result = parseReasoningResponse(raw);

      expect(result.category).toBe("CONFLICT");
      expect(result.severity).toBe("high");
      expect(result.riskScore).toBe(75);
      expect(result.reasoning.whatHappened).toContain("Military forces");
      expect(result.impactAnalysis.secondOrderEffects).toHaveLength(2);
      expect(result.actionableInsights).toHaveLength(2);
      expect(result.entities).toContain("NATO");
    });

    it("extracts JSON from markdown code block", () => {
      const raw = `Here is my analysis:

\`\`\`json
{
  "category": "CYBER",
  "severity": "critical",
  "riskScore": 90,
  "reasoning": {
    "whatHappened": "Major infrastructure hack detected.",
    "whyItMatters": "Critical infrastructure at risk.",
    "whatHappensNext": "Potential cascading failures.",
    "whoIsAffected": "Government and civilian services."
  },
  "impactAnalysis": {
    "primaryImpact": "Service disruption",
    "secondOrderEffects": [],
    "affectedSectors": ["Government"],
    "affectedCountries": ["US"]
  },
  "actionableInsights": ["Activate incident response"],
  "entities": ["APT29"]
}
\`\`\`

This is concerning.`;

      const result = parseReasoningResponse(raw);

      expect(result.category).toBe("CYBER");
      expect(result.severity).toBe("critical");
      expect(result.riskScore).toBe(90);
    });

    it("clamps risk score to 0-100", () => {
      const raw = JSON.stringify({
        category: "OTHER",
        severity: "low",
        riskScore: 150,
        reasoning: { whatHappened: "", whyItMatters: "", whatHappensNext: "", whoIsAffected: "" },
        impactAnalysis: { primaryImpact: "", secondOrderEffects: [], affectedSectors: [], affectedCountries: [] },
        actionableInsights: [],
        entities: [],
      });

      const result = parseReasoningResponse(raw);
      expect(result.riskScore).toBe(100);
    });

    it("clamps negative risk score to 0", () => {
      const raw = JSON.stringify({
        category: "OTHER",
        severity: "info",
        riskScore: -20,
        reasoning: { whatHappened: "", whyItMatters: "", whatHappensNext: "", whoIsAffected: "" },
        impactAnalysis: { primaryImpact: "", secondOrderEffects: [], affectedSectors: [], affectedCountries: [] },
        actionableInsights: [],
        entities: [],
      });

      const result = parseReasoningResponse(raw);
      expect(result.riskScore).toBe(0);
    });

    it("defaults invalid category to OTHER", () => {
      const raw = JSON.stringify({
        category: "INVALID_CATEGORY",
        severity: "medium",
        riskScore: 50,
        reasoning: { whatHappened: "", whyItMatters: "", whatHappensNext: "", whoIsAffected: "" },
        impactAnalysis: { primaryImpact: "", secondOrderEffects: [], affectedSectors: [], affectedCountries: [] },
        actionableInsights: [],
        entities: [],
      });

      const result = parseReasoningResponse(raw);
      expect(result.category).toBe("OTHER");
    });

    it("defaults invalid severity to medium", () => {
      const raw = JSON.stringify({
        category: "CONFLICT",
        severity: "invalid",
        riskScore: 50,
        reasoning: { whatHappened: "", whyItMatters: "", whatHappensNext: "", whoIsAffected: "" },
        impactAnalysis: { primaryImpact: "", secondOrderEffects: [], affectedSectors: [], affectedCountries: [] },
        actionableInsights: [],
        entities: [],
      });

      const result = parseReasoningResponse(raw);
      expect(result.severity).toBe("medium");
    });

    it("throws on invalid JSON", () => {
      expect(() => parseReasoningResponse("not json at all")).toThrow();
    });

    it("throws on response without JSON object", () => {
      expect(() => parseReasoningResponse("just text, no JSON")).toThrow(
        "No JSON object found"
      );
    });

    it("handles missing nested fields gracefully", () => {
      const raw = JSON.stringify({
        category: "ECONOMIC",
        severity: "low",
        riskScore: 30,
        reasoning: {},
        impactAnalysis: {},
        actionableInsights: null,
        entities: null,
      });

      const result = parseReasoningResponse(raw);

      expect(result.reasoning.whatHappened).toBe("");
      expect(result.impactAnalysis.secondOrderEffects).toEqual([]);
      expect(result.actionableInsights).toEqual([]);
      expect(result.entities).toEqual([]);
    });
  });
});
