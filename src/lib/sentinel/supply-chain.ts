// ============================================
// SENTINEL — Supply Chain Risk Engine
// ============================================

import type {
  SupplierProfile,
  SupplierRiskAssessment,
  MitigationOption,
  PortfolioAnalysis,
  ConcentrationRisk,
} from "./types";
import { getBaselineScore, getProximityToConflictZones } from "./crisis-index";

// Capital city coordinates for proximity calculations
const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  UA: { lat: 50.45, lng: 30.52 }, SY: { lat: 33.51, lng: 36.29 },
  YE: { lat: 15.37, lng: 44.21 }, AF: { lat: 34.53, lng: 69.17 },
  IQ: { lat: 33.31, lng: 44.37 }, IR: { lat: 35.69, lng: 51.39 },
  RU: { lat: 55.75, lng: 37.62 }, CN: { lat: 39.90, lng: 116.40 },
  TW: { lat: 25.03, lng: 121.57 }, KR: { lat: 37.57, lng: 126.98 },
  JP: { lat: 35.68, lng: 139.69 }, IN: { lat: 28.61, lng: 77.21 },
  DE: { lat: 52.52, lng: 13.40 }, US: { lat: 38.91, lng: -77.04 },
  GB: { lat: 51.51, lng: -0.13 }, FR: { lat: 48.86, lng: 2.35 },
  BR: { lat: -15.79, lng: -47.88 }, MX: { lat: 19.43, lng: -99.13 },
  NG: { lat: 9.06, lng: 7.49 }, ZA: { lat: -25.75, lng: 28.19 },
  AU: { lat: -35.28, lng: 149.13 }, SG: { lat: 1.35, lng: 103.82 },
  VN: { lat: 21.03, lng: 105.85 }, TH: { lat: 13.76, lng: 100.50 },
  ID: { lat: -6.21, lng: 106.85 }, PH: { lat: 14.60, lng: 120.98 },
  BD: { lat: 23.81, lng: 90.41 }, PK: { lat: 33.69, lng: 73.04 },
  TR: { lat: 39.93, lng: 32.86 }, EG: { lat: 30.04, lng: 31.24 },
  SA: { lat: 24.69, lng: 46.72 }, AE: { lat: 24.45, lng: 54.65 },
};

const CRITICALITY_WEIGHTS: Record<string, number> = {
  critical: 1.0,
  high: 0.7,
  medium: 0.4,
  low: 0.2,
};

export function assessSupplierRisk(
  supplier: SupplierProfile
): SupplierRiskAssessment {
  const countryRiskScore = getBaselineScore(supplier.countryCode);

  const proximityRisk = calculateProximityRisk(supplier.countryCode);

  const cascadeRisk = calculateCascadeRisk(supplier);

  const criticalityWeight = CRITICALITY_WEIGHTS[supplier.criticality] ?? 0.4;

  // Composite: 40% country + 30% proximity + 20% cascade + 10% criticality
  const compositeRisk = Math.min(
    100,
    Math.round(
      countryRiskScore * 0.4 +
      proximityRisk * 0.3 +
      cascadeRisk * 0.2 +
      criticalityWeight * 100 * 0.1
    )
  );

  const riskLevel = scoreToRiskLevel(compositeRisk);
  const mitigations = generateMitigations(supplier, compositeRisk, riskLevel);

  return {
    supplierName: supplier.name,
    countryCode: supplier.countryCode,
    tier: supplier.tier,
    countryRiskScore,
    proximityRisk,
    cascadeRisk,
    compositeRisk,
    riskLevel,
    mitigations,
  };
}

function calculateProximityRisk(countryCode: string): number {
  const coords = COUNTRY_COORDS[countryCode.toUpperCase()];
  if (!coords) return 10; // Unknown location → low proximity risk

  const proximity = getProximityToConflictZones(coords.lat, coords.lng);
  if (!proximity) return 0;

  // Closer = higher risk, linear scale
  const maxRisk = 80;
  const distanceFactor = Math.max(0, 1 - proximity.distanceKm / 500);
  return Math.round(maxRisk * distanceFactor);
}

function calculateCascadeRisk(supplier: SupplierProfile): number {
  if (!supplier.upstream || supplier.upstream.length === 0) return 0;

  // Average risk of upstream suppliers, weighted by tier distance
  let totalRisk = 0;
  let totalWeight = 0;

  for (const upstream of supplier.upstream) {
    const upstreamCountryRisk = getBaselineScore(upstream.countryCode);
    const tierWeight = 1 / upstream.tier; // Closer tiers have more impact
    totalRisk += upstreamCountryRisk * tierWeight;
    totalWeight += tierWeight;
  }

  return totalWeight > 0 ? Math.round(totalRisk / totalWeight) : 0;
}

function scoreToRiskLevel(
  score: number
): "critical" | "high" | "medium" | "low" {
  if (score >= 70) return "critical";
  if (score >= 50) return "high";
  if (score >= 30) return "medium";
  return "low";
}

function generateMitigations(
  supplier: SupplierProfile,
  compositeRisk: number,
  riskLevel: string
): MitigationOption[] {
  const mitigations: MitigationOption[] = [];

  if (riskLevel === "critical" || riskLevel === "high") {
    mitigations.push({
      type: "alternative_supplier",
      description: `Qualify alternative supplier for ${supplier.name} in a lower-risk jurisdiction`,
      estimatedCostReduction: 30,
      implementationTime: "3-6 months",
    });

    mitigations.push({
      type: "safety_stock",
      description: `Increase safety stock buffer to 60-90 days for critical components from ${supplier.countryCode}`,
      estimatedCostReduction: 15,
      implementationTime: "1-2 months",
    });
  }

  if (compositeRisk >= 40) {
    mitigations.push({
      type: "insurance",
      description: "Secure force majeure and political risk insurance coverage",
      estimatedCostReduction: 20,
      implementationTime: "1 month",
    });
  }

  if (riskLevel === "critical") {
    mitigations.push({
      type: "alternative_route",
      description: "Identify alternative logistics routes bypassing conflict zones",
      estimatedCostReduction: 10,
      implementationTime: "2-4 months",
    });
  }

  return mitigations;
}

// ---- Portfolio Analysis ----

export function analyzePortfolio(
  suppliers: SupplierProfile[]
): PortfolioAnalysis {
  const assessments = suppliers.map(assessSupplierRisk);

  // Risk breakdown
  const riskBreakdown: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const a of assessments) {
    riskBreakdown[a.riskLevel]++;
  }

  // Concentration risks
  const concentrationRisks = calculateConcentrationRisks(suppliers);

  // Single points of failure: critical suppliers with no alternatives
  const singlePointsOfFailure = suppliers
    .filter(
      (s) =>
        s.criticality === "critical" &&
        s.tier === 1 &&
        !suppliers.some(
          (other) =>
            other.name !== s.name &&
            other.sector === s.sector &&
            other.tier === 1
        )
    )
    .map((s) => s.name);

  // High-risk countries
  const highRiskCountries = [...new Set(
    assessments
      .filter((a) => a.compositeRisk >= 50)
      .map((a) => a.countryCode)
  )];

  // Recommendations
  const recommendations = generatePortfolioRecommendations(
    assessments,
    concentrationRisks,
    singlePointsOfFailure
  );

  return {
    totalSuppliers: suppliers.length,
    riskBreakdown,
    concentrationRisks,
    singlePointsOfFailure,
    highRiskCountries,
    recommendations,
  };
}

function calculateConcentrationRisks(
  suppliers: SupplierProfile[]
): ConcentrationRisk[] {
  const risks: ConcentrationRisk[] = [];
  const total = suppliers.length;

  // Country concentration
  const countryCounts = new Map<string, number>();
  for (const s of suppliers) {
    countryCounts.set(s.countryCode, (countryCounts.get(s.countryCode) || 0) + 1);
  }
  for (const [country, count] of countryCounts) {
    const pct = (count / total) * 100;
    if (pct >= 30) {
      risks.push({
        type: "country",
        value: country,
        supplierCount: count,
        percentageOfTotal: Math.round(pct),
        riskLevel: pct >= 50 ? "critical" : "high",
      });
    }
  }

  // Tier concentration
  const tierCounts = new Map<number, number>();
  for (const s of suppliers) {
    tierCounts.set(s.tier, (tierCounts.get(s.tier) || 0) + 1);
  }
  for (const [tier, count] of tierCounts) {
    const pct = (count / total) * 100;
    if (tier === 1 && pct >= 40) {
      risks.push({
        type: "tier",
        value: `Tier ${tier}`,
        supplierCount: count,
        percentageOfTotal: Math.round(pct),
        riskLevel: pct >= 60 ? "critical" : "medium",
      });
    }
  }

  // Sector concentration
  const sectorCounts = new Map<string, number>();
  for (const s of suppliers) {
    sectorCounts.set(s.sector, (sectorCounts.get(s.sector) || 0) + 1);
  }
  for (const [sector, count] of sectorCounts) {
    const pct = (count / total) * 100;
    if (pct >= 40) {
      risks.push({
        type: "sector",
        value: sector,
        supplierCount: count,
        percentageOfTotal: Math.round(pct),
        riskLevel: pct >= 60 ? "high" : "medium",
      });
    }
  }

  return risks;
}

function generatePortfolioRecommendations(
  assessments: SupplierRiskAssessment[],
  concentrationRisks: ConcentrationRisk[],
  singlePoints: string[]
): string[] {
  const recs: string[] = [];

  const criticalCount = assessments.filter(
    (a) => a.riskLevel === "critical"
  ).length;
  if (criticalCount > 0) {
    recs.push(
      `${criticalCount} supplier(s) rated critical risk — immediate review and mitigation planning required`
    );
  }

  if (singlePoints.length > 0) {
    recs.push(
      `${singlePoints.length} single point(s) of failure identified: ${singlePoints.join(", ")}. Qualify alternative suppliers urgently.`
    );
  }

  for (const cr of concentrationRisks) {
    if (cr.type === "country") {
      recs.push(
        `${cr.percentageOfTotal}% of suppliers concentrated in ${cr.value} — diversify sourcing geography`
      );
    }
  }

  const highRiskPct = assessments.filter(
    (a) => a.riskLevel === "critical" || a.riskLevel === "high"
  ).length / assessments.length * 100;

  if (highRiskPct >= 30) {
    recs.push(
      `${Math.round(highRiskPct)}% of portfolio in high/critical risk — consider portfolio-wide insurance program`
    );
  }

  if (recs.length === 0) {
    recs.push("Supply chain risk profile is within acceptable parameters");
  }

  return recs;
}
