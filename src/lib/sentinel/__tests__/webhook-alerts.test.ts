import { describe, it, expect } from "vitest";
import {
  shouldTriggerWebhook,
  buildIntelligenceAlert,
  buildKeywordSpikeAlert,
  buildCrisisEscalationAlert,
  buildScreeningAlert,
} from "../webhook-alerts";
import type { EventSeverity } from "../types";

describe("webhook-alerts", () => {
  // ---- shouldTriggerWebhook ----

  // 1. critical >= critical → true
  it("triggers when critical meets critical threshold", () => {
    expect(shouldTriggerWebhook("critical", "critical")).toBe(true);
  });

  // 2. high >= medium → true
  it("triggers when high meets medium threshold", () => {
    expect(shouldTriggerWebhook("high", "medium")).toBe(true);
  });

  // 3. low >= high → false
  it("does not trigger when low is below high threshold", () => {
    expect(shouldTriggerWebhook("low", "high")).toBe(false);
  });

  // 4. info >= critical → false
  it("does not trigger when info is below critical threshold", () => {
    expect(shouldTriggerWebhook("info", "critical")).toBe(false);
  });

  // 5. medium >= medium → true
  it("triggers when medium meets medium threshold", () => {
    expect(shouldTriggerWebhook("medium", "medium")).toBe(true);
  });

  // ---- buildIntelligenceAlert ----

  const sampleEvent = {
    headline: "Earthquake in Turkey",
    category: "DISASTER",
    severity: "high" as EventSeverity,
    riskScore: 72,
    countryCode: "TR",
    source: "reuters-world",
  };

  // 6. Returns correct eventType
  it("buildIntelligenceAlert returns intelligence_event eventType", () => {
    const payload = buildIntelligenceAlert(sampleEvent);
    expect(payload.eventType).toBe("intelligence_event");
  });

  // 7. Includes all data fields
  it("buildIntelligenceAlert includes all data fields", () => {
    const payload = buildIntelligenceAlert(sampleEvent);
    expect(payload.data).toEqual({
      headline: "Earthquake in Turkey",
      category: "DISASTER",
      riskScore: 72,
      countryCode: "TR",
      source: "reuters-world",
    });
  });

  // 8. Has ISO timestamp
  it("buildIntelligenceAlert has ISO timestamp", () => {
    const payload = buildIntelligenceAlert(sampleEvent);
    const parsed = new Date(payload.timestamp);
    expect(parsed.toISOString()).toBe(payload.timestamp);
  });

  // ---- buildKeywordSpikeAlert ----

  // 9. Returns keyword_spike eventType
  it("buildKeywordSpikeAlert returns keyword_spike eventType", () => {
    const payload = buildKeywordSpikeAlert({
      keyword: "sanctions",
      ratio: 5.2,
      sources: ["reuters-world", "bbc-world"],
      severity: "high",
    });
    expect(payload.eventType).toBe("keyword_spike");
  });

  // ---- buildCrisisEscalationAlert ----

  // 10. score >= 80 → critical severity
  it("buildCrisisEscalationAlert returns critical when score >= 80", () => {
    const payload = buildCrisisEscalationAlert({
      countryCode: "UA",
      countryName: "Ukraine",
      previousScore: 70,
      currentScore: 85,
      level: "critical",
    });
    expect(payload.severity).toBe("critical");
  });

  // 11. score < 80 → high severity
  it("buildCrisisEscalationAlert returns high when score < 80", () => {
    const payload = buildCrisisEscalationAlert({
      countryCode: "MM",
      countryName: "Myanmar",
      previousScore: 50,
      currentScore: 65,
      level: "severe",
    });
    expect(payload.severity).toBe("high");
  });

  // ---- buildScreeningAlert ----

  // 12. compositeScore >= 75 → critical
  it("buildScreeningAlert returns critical when compositeScore >= 75", () => {
    const payload = buildScreeningAlert({
      entityName: "Acme Corp",
      compositeScore: 80,
      recommendation: "block",
    });
    expect(payload.severity).toBe("critical");
    expect(payload.eventType).toBe("screening_alert");
  });
});
