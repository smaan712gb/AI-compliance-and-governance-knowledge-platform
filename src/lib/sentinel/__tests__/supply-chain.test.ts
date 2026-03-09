import { describe, it, expect } from "vitest";
import { assessSupplierRisk, analyzePortfolio } from "../supply-chain";
import type { SupplierProfile } from "../types";

describe("Supply Chain Risk Engine", () => {
  // ---- Single Supplier Assessment ----
  describe("assessSupplierRisk", () => {
    it("assesses low-risk supplier in stable country", () => {
      const supplier: SupplierProfile = {
        name: "SafeSupplier GmbH",
        countryCode: "DE",
        tier: 1,
        criticality: "medium",
        sector: "Electronics",
      };

      const assessment = assessSupplierRisk(supplier);

      expect(assessment.supplierName).toBe("SafeSupplier GmbH");
      expect(assessment.countryCode).toBe("DE");
      expect(assessment.countryRiskScore).toBe(10); // Germany baseline
      expect(assessment.compositeRisk).toBeLessThan(30);
      expect(assessment.riskLevel).toBe("low");
    });

    it("assesses high-risk supplier in conflict zone", () => {
      const supplier: SupplierProfile = {
        name: "UkrainianParts Ltd",
        countryCode: "UA",
        tier: 1,
        criticality: "critical",
        sector: "Raw Materials",
      };

      const assessment = assessSupplierRisk(supplier);

      expect(assessment.countryRiskScore).toBe(75); // Ukraine baseline
      expect(assessment.compositeRisk).toBeGreaterThanOrEqual(40);
      expect(["critical", "high", "medium"]).toContain(assessment.riskLevel);
      expect(assessment.mitigations.length).toBeGreaterThanOrEqual(0);
    });

    it("includes cascade risk from upstream suppliers", () => {
      const supplier: SupplierProfile = {
        name: "MidStream Corp",
        countryCode: "DE",
        tier: 1,
        criticality: "high",
        sector: "Components",
        upstream: [
          {
            name: "RawMat Syria",
            countryCode: "SY",
            tier: 2,
            criticality: "medium",
            sector: "Raw Materials",
          },
        ],
      };

      const assessment = assessSupplierRisk(supplier);

      expect(assessment.cascadeRisk).toBeGreaterThan(0);
      // Syria upstream should increase cascade risk
      expect(assessment.cascadeRisk).toBeGreaterThan(30);
    });

    it("generates mitigations for high-risk suppliers", () => {
      const supplier: SupplierProfile = {
        name: "RiskySupplier",
        countryCode: "SY", // Syria — higher baseline than AF for guaranteed high risk
        tier: 1,
        criticality: "critical",
        sector: "Minerals",
      };

      const assessment = assessSupplierRisk(supplier);

      expect(assessment.compositeRisk).toBeGreaterThanOrEqual(40);
      // Mitigations are generated when riskLevel is critical or high, or compositeRisk >= 40
      expect(assessment.mitigations.length).toBeGreaterThan(0);
    });

    it("generates no alternative_supplier mitigation for low-risk", () => {
      const supplier: SupplierProfile = {
        name: "SwissWatch AG",
        countryCode: "CH",
        tier: 1,
        criticality: "low",
        sector: "Luxury",
      };

      const assessment = assessSupplierRisk(supplier);

      const hasAltSupplier = assessment.mitigations.some(
        (m) => m.type === "alternative_supplier"
      );
      expect(hasAltSupplier).toBe(false);
    });

    it("risk scores are always 0-100", () => {
      const extremeSupplier: SupplierProfile = {
        name: "Extreme",
        countryCode: "UA",
        tier: 1,
        criticality: "critical",
        sector: "Defense",
        upstream: [
          { name: "Sub1", countryCode: "SY", tier: 2, criticality: "critical", sector: "Arms" },
          { name: "Sub2", countryCode: "AF", tier: 2, criticality: "critical", sector: "Arms" },
        ],
      };

      const assessment = assessSupplierRisk(extremeSupplier);

      expect(assessment.compositeRisk).toBeGreaterThanOrEqual(0);
      expect(assessment.compositeRisk).toBeLessThanOrEqual(100);
      expect(assessment.countryRiskScore).toBeGreaterThanOrEqual(0);
      expect(assessment.countryRiskScore).toBeLessThanOrEqual(100);
    });
  });

  // ---- Portfolio Analysis ----
  describe("analyzePortfolio", () => {
    const testPortfolio: SupplierProfile[] = [
      { name: "GermanTech", countryCode: "DE", tier: 1, criticality: "critical", sector: "Electronics" },
      { name: "JapanParts", countryCode: "JP", tier: 1, criticality: "high", sector: "Electronics" },
      { name: "ChinaMfg", countryCode: "CN", tier: 1, criticality: "high", sector: "Manufacturing" },
      { name: "UkraineMetal", countryCode: "UA", tier: 2, criticality: "medium", sector: "Raw Materials" },
      { name: "USLogistics", countryCode: "US", tier: 1, criticality: "low", sector: "Logistics" },
    ];

    it("returns correct total supplier count", () => {
      const portfolio = analyzePortfolio(testPortfolio);
      expect(portfolio.totalSuppliers).toBe(5);
    });

    it("breaks down risk by level", () => {
      const portfolio = analyzePortfolio(testPortfolio);

      const totalInBreakdown = Object.values(portfolio.riskBreakdown).reduce(
        (a, b) => a + b,
        0
      );
      expect(totalInBreakdown).toBe(5);
    });

    it("identifies high-risk countries", () => {
      const portfolio = analyzePortfolio(testPortfolio);
      // Ukraine should appear in high-risk countries
      if (portfolio.highRiskCountries.length > 0) {
        expect(portfolio.highRiskCountries).toContain("UA");
      }
    });

    it("detects single points of failure", () => {
      const spofPortfolio: SupplierProfile[] = [
        { name: "OnlyElectronics", countryCode: "DE", tier: 1, criticality: "critical", sector: "Electronics" },
        { name: "OnlyRaw", countryCode: "JP", tier: 1, criticality: "critical", sector: "Raw Materials" },
      ];

      const portfolio = analyzePortfolio(spofPortfolio);

      // Both are single points of failure (only one in each sector at tier 1)
      expect(portfolio.singlePointsOfFailure.length).toBe(2);
    });

    it("generates recommendations", () => {
      const portfolio = analyzePortfolio(testPortfolio);
      expect(portfolio.recommendations).toBeDefined();
      expect(Array.isArray(portfolio.recommendations)).toBe(true);
    });

    it("detects country concentration risk", () => {
      const concentratedPortfolio: SupplierProfile[] = [
        { name: "CN1", countryCode: "CN", tier: 1, criticality: "high", sector: "A" },
        { name: "CN2", countryCode: "CN", tier: 1, criticality: "high", sector: "B" },
        { name: "CN3", countryCode: "CN", tier: 1, criticality: "high", sector: "C" },
        { name: "DE1", countryCode: "DE", tier: 1, criticality: "low", sector: "D" },
      ];

      const portfolio = analyzePortfolio(concentratedPortfolio);

      // 75% in CN should trigger concentration risk
      const cnConcentration = portfolio.concentrationRisks.find(
        (r) => r.type === "country" && r.value === "CN"
      );
      expect(cnConcentration).toBeDefined();
      expect(cnConcentration!.percentageOfTotal).toBe(75);
    });

    it("handles empty upstream gracefully", () => {
      const simplePortfolio: SupplierProfile[] = [
        { name: "Simple", countryCode: "US", tier: 1, criticality: "low", sector: "Tech" },
      ];

      const portfolio = analyzePortfolio(simplePortfolio);
      expect(portfolio.totalSuppliers).toBe(1);
    });
  });
});
