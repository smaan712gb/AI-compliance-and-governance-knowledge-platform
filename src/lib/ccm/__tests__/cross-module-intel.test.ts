import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db
const mockFindingFindMany = vi.fn();
const mockFindingFindFirst = vi.fn();
const mockEventFindMany = vi.fn();
const mockEventFindUnique = vi.fn();
const mockRuleFindMany = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    finding: {
      findMany: (...args: unknown[]) => mockFindingFindMany(...args),
      findFirst: (...args: unknown[]) => mockFindingFindFirst(...args),
    },
    intelligenceEvent: {
      findMany: (...args: unknown[]) => mockEventFindMany(...args),
      findUnique: (...args: unknown[]) => mockEventFindUnique(...args),
    },
    monitoringRule: {
      findMany: (...args: unknown[]) => mockRuleFindMany(...args),
    },
  },
}));

import {
  runCrossModuleAnalysis,
  checkEventImpact,
  enrichFindingWithIntelligence,
  checkRegulatoryChanges,
} from "../cross-module-intel";

beforeEach(() => {
  vi.clearAllMocks();
  mockFindingFindMany.mockResolvedValue([]);
  mockFindingFindFirst.mockResolvedValue(null);
  mockEventFindMany.mockResolvedValue([]);
  mockEventFindUnique.mockResolvedValue(null);
  mockRuleFindMany.mockResolvedValue([]);
});

// ---- runCrossModuleAnalysis ----

describe("runCrossModuleAnalysis", () => {
  it("finds SANCTIONS_MATCH correlation", async () => {
    mockFindingFindMany.mockResolvedValue([
      {
        id: "f-1",
        title: "Suspicious wire transfer to Iran entity IRISL",
        description: "Wire transfer to Iranian shipping company IRISL flagged by AML system",
        severity: "HIGH",
        status: "OPEN",
        framework: "AML_BSA",
        createdAt: new Date(),
      },
    ]);
    mockEventFindMany.mockResolvedValue([
      {
        id: "e-1",
        headline: "OFAC designates IRISL subsidiaries",
        summary: "New OFAC sanctions targeting Iranian shipping entity IRISL",
        category: "SANCTIONS",
        entities: ["IRISL"],
        countryCode: "IR",
        countryName: "Iran",
        riskScore: 90,
        processedAt: new Date(),
      },
    ]);

    const report = await runCrossModuleAnalysis("org-1");
    expect(report.correlationsFound).toBeGreaterThanOrEqual(1);
    const sanctionsMatch = report.correlations.find(
      (c) => c.correlationType === "SANCTIONS_MATCH"
    );
    expect(sanctionsMatch).toBeDefined();
    expect(sanctionsMatch!.ccmFindingId).toBe("f-1");
    expect(sanctionsMatch!.sentinelEventId).toBe("e-1");
    expect(sanctionsMatch!.confidence).toBeGreaterThanOrEqual(50);
    expect(sanctionsMatch!.actionRequired).toBe(true);
    expect(sanctionsMatch!.description).toContain("IRISL");
  });

  it("finds COUNTRY_RISK correlation", async () => {
    // Use framework that does NOT match categoryToFrameworks("CONFLICT") to avoid
    // hitting REGULATORY_CHANGE or GEOPOLITICAL_RISK branches first.
    // CONFLICT maps to ["AML_BSA", "CUSTOM"], so use ISO_27001 to avoid framework match.
    // COUNTRY_RISK branch: sharedCountries.length > 0 && event.riskScore > 60
    mockFindingFindMany.mockResolvedValue([
      {
        id: "f-2",
        title: "Compliance review for Russia operations",
        description: "Quarterly check for Russian subsidiary",
        severity: "MEDIUM",
        status: "OPEN",
        framework: "ISO_27001",
        createdAt: new Date(),
      },
    ]);
    mockEventFindMany.mockResolvedValue([
      {
        id: "e-2",
        headline: "Military conflict escalation near border",
        summary: "Armed tensions rising in the region",
        category: "CONFLICT",
        entities: [],
        countryCode: "RU",
        countryName: "Russia",
        riskScore: 85,
        processedAt: new Date(),
      },
    ]);

    const report = await runCrossModuleAnalysis("org-1");
    const countryRisk = report.correlations.find(
      (c) => c.correlationType === "COUNTRY_RISK"
    );
    expect(countryRisk).toBeDefined();
    expect(countryRisk!.description).toContain("RU");
    expect(countryRisk!.confidence).toBeGreaterThanOrEqual(30);
  });

  it("finds ENTITY_OVERLAP correlation", async () => {
    mockFindingFindMany.mockResolvedValue([
      {
        id: "f-3",
        title: "Acme Corp suspicious transactions",
        description: "Multiple flagged transactions involving Acme Corp",
        severity: "HIGH",
        status: "OPEN",
        framework: "CUSTOM",
        createdAt: new Date(),
      },
    ]);
    mockEventFindMany.mockResolvedValue([
      {
        id: "e-3",
        headline: "Acme Corp under investigation for fraud",
        summary: "Authorities investigating Acme Corp for financial fraud activities",
        category: "ECONOMIC",
        entities: ["Acme Corp"],
        countryCode: "US",
        countryName: "United States",
        riskScore: 75,
        processedAt: new Date(),
      },
    ]);

    const report = await runCrossModuleAnalysis("org-1");
    const entityOverlap = report.correlations.find(
      (c) => c.correlationType === "ENTITY_OVERLAP"
    );
    expect(entityOverlap).toBeDefined();
    expect(entityOverlap!.description).toContain("Acme Corp");
    expect(entityOverlap!.confidence).toBeGreaterThanOrEqual(30);
  });

  it("returns empty correlations when no matches", async () => {
    mockFindingFindMany.mockResolvedValue([
      {
        id: "f-4",
        title: "Internal audit improvement",
        description: "Routine internal audit scheduling optimization",
        severity: "LOW",
        status: "OPEN",
        framework: "ISO_27001",
        createdAt: new Date(),
      },
    ]);
    mockEventFindMany.mockResolvedValue([
      {
        id: "e-4",
        headline: "Trade agreement signed in South America",
        summary: "New bilateral trade agreement between Brazil and Argentina",
        category: "ECONOMIC",
        entities: [],
        countryCode: "BR",
        countryName: "Brazil",
        riskScore: 20,
        processedAt: new Date(),
      },
    ]);

    const report = await runCrossModuleAnalysis("org-1");
    expect(report.correlationsFound).toBe(0);
    expect(report.correlations).toHaveLength(0);
  });

  it("includes risk elevations for high-confidence matches", async () => {
    mockFindingFindMany.mockResolvedValue([
      {
        id: "f-5",
        title: "Iran IRISL transaction monitoring",
        description: "AML screening hit for IRISL shipping",
        severity: "MEDIUM",
        status: "OPEN",
        framework: "AML_BSA",
        createdAt: new Date(),
      },
    ]);
    mockEventFindMany.mockResolvedValue([
      {
        id: "e-5",
        headline: "OFAC new sanctions on IRISL network",
        summary: "IRISL designated under executive order",
        category: "SANCTIONS",
        entities: ["IRISL"],
        countryCode: "IR",
        countryName: "Iran",
        riskScore: 95,
        processedAt: new Date(),
      },
    ]);

    const report = await runCrossModuleAnalysis("org-1");
    expect(report.riskElevations.length).toBeGreaterThanOrEqual(1);
    const elevation = report.riskElevations[0];
    expect(elevation.findingId).toBe("f-5");
    expect(elevation.originalSeverity).toBe("MEDIUM");
    // Should elevate by 2 steps since riskScore > 80
    expect(elevation.recommendedSeverity).toBe("CRITICAL");
  });
});

// ---- checkEventImpact ----

describe("checkEventImpact", () => {
  it("finds affected CCM findings for sanctions event", async () => {
    mockEventFindUnique.mockResolvedValue({
      id: "e-10",
      headline: "OFAC designates IRISL subsidiaries",
      summary: "Iranian shipping sanctions expanded",
      category: "SANCTIONS",
      entities: ["IRISL"],
      countryCode: "IR",
      riskScore: 90,
    });

    mockFindingFindMany.mockResolvedValue([
      {
        id: "f-10",
        title: "IRISL AML screening hit",
        description: "Transaction flagged involving IRISL entity",
        framework: "AML_BSA",
        status: "OPEN",
      },
      {
        id: "f-11",
        title: "Routine internal audit",
        description: "Quarterly IT audit check",
        framework: "ISO_27001",
        status: "OPEN",
      },
    ]);

    const result = await checkEventImpact("e-10", "org-1");
    expect(result.impactsFound).toBeGreaterThanOrEqual(1);
    expect(result.affectedFindings).toContain("f-10");
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations[0]).toContain("sanctions");
  });

  it("returns empty when event not found", async () => {
    mockEventFindUnique.mockResolvedValue(null);

    const result = await checkEventImpact("nonexistent", "org-1");
    expect(result.impactsFound).toBe(0);
    expect(result.affectedFindings).toHaveLength(0);
    expect(result.recommendations).toHaveLength(0);
  });
});

// ---- enrichFindingWithIntelligence ----

describe("enrichFindingWithIntelligence", () => {
  it("returns related events", async () => {
    mockFindingFindFirst.mockResolvedValue({
      id: "f-20",
      title: "Iran sanctions compliance check",
      description: "Review of Iran-related transactions for AML compliance",
      framework: "AML_BSA",
    });

    mockEventFindMany.mockResolvedValue([
      {
        id: "e-20",
        headline: "New OFAC Iran sanctions package",
        summary: "OFAC expands Iran sanctions targeting financial sector",
        category: "SANCTIONS",
        entities: ["IRISL", "Bank Melli"],
        countryCode: "IR",
        countryName: "Iran",
        riskScore: 88,
        processedAt: new Date(),
      },
      {
        id: "e-21",
        headline: "EU agricultural trade deal",
        summary: "New trade deal for European agriculture exports",
        category: "ECONOMIC",
        entities: [],
        countryCode: "DE",
        countryName: "Germany",
        riskScore: 10,
        processedAt: new Date(),
      },
    ]);

    const result = await enrichFindingWithIntelligence("f-20", "org-1");
    expect(result.relatedEvents.length).toBeGreaterThanOrEqual(1);
    // The Iran sanctions event should be the top match
    const topEvent = result.relatedEvents[0];
    expect(topEvent.eventId).toBe("e-20");
    expect(topEvent.headline).toContain("OFAC");
    expect(result.riskContext).toContain("Iran");
    expect(result.geopoliticalFactors.length).toBeGreaterThan(0);
  });

  it("returns empty when finding not found", async () => {
    mockFindingFindFirst.mockResolvedValue(null);

    const result = await enrichFindingWithIntelligence("nonexistent", "org-1");
    expect(result.relatedEvents).toHaveLength(0);
    expect(result.riskContext).toBe("Finding not found");
    expect(result.geopoliticalFactors).toHaveLength(0);
  });
});

// ---- checkRegulatoryChanges ----

describe("checkRegulatoryChanges", () => {
  it("detects changes affecting active rules", async () => {
    mockRuleFindMany.mockResolvedValue([
      {
        id: "rule-1",
        name: "AML Transaction Monitoring",
        description: "Monitor transactions for AML compliance with OFAC sanctions list",
        framework: "AML_BSA",
        isActive: true,
      },
    ]);

    mockEventFindMany.mockResolvedValue([
      {
        id: "e-30",
        headline: "New OFAC sanctions regulation enacted for financial institutions",
        summary: "Updated compliance requirement for AML monitoring in financial sector, new sanctions list designations effective immediately",
        category: "SANCTIONS",
        entities: [],
        countryCode: "US",
        processedAt: new Date(),
      },
    ]);

    const result = await checkRegulatoryChanges("org-1");
    expect(result.changesDetected).toBeGreaterThanOrEqual(1);
    expect(result.affectedRules.length).toBeGreaterThanOrEqual(1);
    const affected = result.affectedRules[0];
    expect(affected.ruleId).toBe("rule-1");
    expect(affected.ruleName).toBe("AML Transaction Monitoring");
    expect(affected.change).toContain("OFAC");
    expect(affected.recommendation).toBeDefined();
  });

  it("returns empty when no regulatory events match rules", async () => {
    mockRuleFindMany.mockResolvedValue([
      {
        id: "rule-2",
        name: "ISO 27001 Access Control",
        description: "Monitor access control compliance",
        framework: "ISO_27001",
        isActive: true,
      },
    ]);

    mockEventFindMany.mockResolvedValue([
      {
        id: "e-31",
        headline: "Trade agreement signed between two countries",
        summary: "Bilateral trade deal focusing on agriculture imports",
        category: "POLITICAL",
        entities: [],
        countryCode: "BR",
        processedAt: new Date(),
      },
    ]);

    const result = await checkRegulatoryChanges("org-1");
    expect(result.changesDetected).toBe(0);
    expect(result.affectedRules).toHaveLength(0);
  });

  it("deduplicates affected rules by ruleId", async () => {
    mockRuleFindMany.mockResolvedValue([
      {
        id: "rule-3",
        name: "OFAC Sanctions Screening",
        description: "Screen all counterparties against OFAC sanctions list",
        framework: "AML_BSA",
        isActive: true,
      },
    ]);

    // Two events that both match the same rule
    mockEventFindMany.mockResolvedValue([
      {
        id: "e-40",
        headline: "New OFAC sanctions designation list updated",
        summary: "OFAC compliance requirement for sanctions screening updated",
        category: "SANCTIONS",
        processedAt: new Date(),
      },
      {
        id: "e-41",
        headline: "OFAC enforcement action against AML violations",
        summary: "OFAC penalty for sanctions screening failures at financial institution",
        category: "SANCTIONS",
        processedAt: new Date(),
      },
    ]);

    const result = await checkRegulatoryChanges("org-1");
    // Should deduplicate: only 1 entry for rule-3
    const ruleIds = result.affectedRules.map((r) => r.ruleId);
    const uniqueRuleIds = new Set(ruleIds);
    expect(uniqueRuleIds.size).toBe(ruleIds.length);
  });
});
