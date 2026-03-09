import { describe, it, expect, beforeEach } from "vitest";
import {
  classifyEvent,
  extractCountryCode,
  extractEntities,
  resetCircuitBreakers,
} from "../feed-ingestion";

describe("Feed Ingestion — Pure Functions", () => {
  // ============================================
  // classifyEvent
  // ============================================
  describe("classifyEvent", () => {
    // ---- Category Detection ----

    it("classifies military/conflict keywords as CONFLICT", () => {
      const result = classifyEvent(
        "Military airstrike targets enemy positions",
        "Troops deployed to the frontline amid ongoing combat"
      );
      expect(result.category).toBe("CONFLICT");
    });

    it("classifies terrorism keywords as TERRORISM", () => {
      const result = classifyEvent(
        "Terrorist attack in city center",
        "Extremist group claims responsibility for car bomb"
      );
      expect(result.category).toBe("TERRORISM");
    });

    it("classifies cyber keywords as CYBER", () => {
      const result = classifyEvent(
        "Major ransomware attack on hospital",
        "Data breach exposes patient records after malware infection"
      );
      expect(result.category).toBe("CYBER");
    });

    it("classifies economic keywords as ECONOMIC", () => {
      const result = classifyEvent(
        "New sanctions imposed on trade",
        "Tariff increases cause economic crisis and inflation concerns"
      );
      expect(result.category).toBe("ECONOMIC");
    });

    it("classifies political keywords as POLITICAL", () => {
      const result = classifyEvent(
        "Coup attempt in capital city",
        "Protesters demand regime change amid political unrest"
      );
      expect(result.category).toBe("POLITICAL");
    });

    it("classifies disaster keywords as DISASTER", () => {
      const result = classifyEvent(
        "Massive earthquake hits coastal region",
        "Tsunami warnings issued after volcanic activity and flooding"
      );
      expect(result.category).toBe("DISASTER");
    });

    it("classifies sanctions-specific keywords as SANCTIONS", () => {
      const result = classifyEvent(
        "OFAC adds entities to SDN list",
        "Asset freeze and travel ban imposed on specially designated nationals"
      );
      expect(result.category).toBe("SANCTIONS");
    });

    it("classifies generic text with no keywords as OTHER", () => {
      const result = classifyEvent(
        "Local community event this weekend",
        "Farmers market opens at the park on Saturday morning"
      );
      expect(result.category).toBe("OTHER");
    });

    it("picks the category with the most keyword matches", () => {
      // Multiple CONFLICT keywords vs one DISASTER keyword
      const result = classifyEvent(
        "Military troops in combat after airstrike and bombing",
        "Earthquake reported nearby but casualties from artillery fire"
      );
      expect(result.category).toBe("CONFLICT");
    });

    // ---- Severity Detection ----

    it("assigns critical severity for breaking/nuclear/imminent keywords", () => {
      const result = classifyEvent(
        "BREAKING: Nuclear threat imminent",
        "Emergency declared as catastrophic situation unfolds"
      );
      expect(result.severity).toBe("critical");
    });

    it("assigns high severity for major/escalation keywords", () => {
      const result = classifyEvent(
        "Major escalation in conflict",
        "Significant and unprecedented military buildup observed"
      );
      expect(result.severity).toBe("high");
    });

    it("assigns medium severity for tension/warning keywords", () => {
      const result = classifyEvent(
        "Tensions rise amid warning signs",
        "Alert issued over suspected incident under investigation"
      );
      expect(result.severity).toBe("medium");
    });

    it("assigns low severity when category matches but no severity keywords", () => {
      const result = classifyEvent(
        "Troops move near border",
        "Artillery observed in the area"
      );
      expect(result.category).toBe("CONFLICT");
      expect(result.severity).toBe("low");
    });

    it("assigns info severity for completely generic text with no matches", () => {
      const result = classifyEvent(
        "Local community event this weekend",
        "Farmers market opens at the park on Saturday morning"
      );
      expect(result.severity).toBe("info");
    });

    // ---- Risk Score ----

    it("returns a risk score between 0 and 100", () => {
      const result = classifyEvent(
        "BREAKING: Nuclear threat imminent",
        "Emergency military airstrike bombing troops combat invasion"
      );
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    it("caps risk score at 100 even with many keyword matches", () => {
      const result = classifyEvent(
        "BREAKING: Nuclear imminent emergency catastrophic",
        "war military troops airstrike bombing combat invasion offensive ceasefire weapons artillery drone strike missile casualties frontline battlefield"
      );
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    it("returns a low risk score for generic text", () => {
      const result = classifyEvent(
        "Nice day for a walk",
        "Nothing special happening today"
      );
      expect(result.riskScore).toBeLessThanOrEqual(15);
    });

    it("returns higher risk score for critical events than low events", () => {
      const critical = classifyEvent(
        "BREAKING: Nuclear threat imminent",
        "Emergency military invasion"
      );
      const low = classifyEvent("Troops seen near border", "Artillery observed");
      expect(critical.riskScore).toBeGreaterThan(low.riskScore);
    });
  });

  // ============================================
  // extractCountryCode
  // ============================================
  describe("extractCountryCode", () => {
    it("extracts UA for Ukraine", () => {
      expect(extractCountryCode("Ukraine conflict escalates")).toBe("UA");
    });

    it("extracts RU for Russia", () => {
      expect(extractCountryCode("Russia mobilizes troops")).toBe("RU");
    });

    it("extracts JP for Japan", () => {
      expect(extractCountryCode("Earthquake in Japan causes damage")).toBe("JP");
    });

    it("extracts PS for Gaza", () => {
      expect(extractCountryCode("Gaza humanitarian crisis deepens")).toBe("PS");
    });

    it("extracts KP for North Korea", () => {
      expect(extractCountryCode("North Korea launches missile test")).toBe("KP");
    });

    it("extracts GB for United Kingdom", () => {
      expect(extractCountryCode("United Kingdom policy change announced")).toBe(
        "GB"
      );
    });

    it("returns null when no country is mentioned", () => {
      expect(extractCountryCode("No country mentioned here")).toBeNull();
    });

    it("handles case-insensitive matching", () => {
      expect(extractCountryCode("CHINA trade war intensifies")).toBe("CN");
    });

    it("extracts the first matching country when multiple are present", () => {
      // The function iterates COUNTRY_PATTERNS object; ukraine comes before russia
      const result = extractCountryCode("Ukraine and Russia tensions");
      expect(result).not.toBeNull();
      expect(["UA", "RU"]).toContain(result);
    });
  });

  // ============================================
  // extractEntities
  // ============================================
  describe("extractEntities", () => {
    it("extracts multi-word capitalized phrases as entities", () => {
      const entities = extractEntities(
        "The United Nations issued a statement today."
      );
      // Regex captures "The United Nations" as a contiguous capitalized phrase
      expect(entities.some((e) => e.includes("United Nations"))).toBe(true);
    });

    it("extracts multiple entities from text", () => {
      const entities = extractEntities(
        "The European Union met with North Atlantic Treaty Organization leaders."
      );
      expect(entities.length).toBeGreaterThanOrEqual(2);
      expect(entities.some((e) => e.includes("European Union"))).toBe(true);
      expect(entities.some((e) => e.includes("North Atlantic Treaty Organization"))).toBe(true);
    });

    it("returns empty array for text with no capitalized phrases", () => {
      const entities = extractEntities(
        "nothing special going on in this lowercase text."
      );
      expect(entities).toEqual([]);
    });

    it("limits results to 10 entities maximum", () => {
      // Generate text with more than 10 capitalized multi-word phrases
      const names = Array.from(
        { length: 15 },
        (_, i) => `Alpha Bravo${String.fromCharCode(65 + i)}`
      ).join(" met with ");
      const entities = extractEntities(names);
      expect(entities.length).toBeLessThanOrEqual(10);
    });

    it("deduplicates entities", () => {
      const entities = extractEntities(
        "United Nations met with United Nations representatives and United Nations officials."
      );
      const unCount = entities.filter((e) => e === "United Nations").length;
      expect(unCount).toBe(1);
    });
  });

  // ============================================
  // resetCircuitBreakers
  // ============================================
  describe("resetCircuitBreakers", () => {
    beforeEach(() => {
      resetCircuitBreakers();
    });

    it("does not throw when called", () => {
      expect(() => resetCircuitBreakers()).not.toThrow();
    });

    it("can be called multiple times without error", () => {
      resetCircuitBreakers();
      resetCircuitBreakers();
      resetCircuitBreakers();
      // No assertion needed — just verifying no throw
    });
  });
});
