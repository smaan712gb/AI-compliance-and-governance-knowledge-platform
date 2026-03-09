// ============================================
// SENTINEL — Supply Chain Impact Monitor
// Automatically re-scores suppliers when events
// hit their countries, routes, or sectors.
// Generates AI impact assessments + alerts.
// ============================================

import { db } from "@/lib/db";
import { assessSupplierRisk } from "./supply-chain";
import { analyzeEvent } from "./reasoning";
import { broadcastAlert, buildIntelligenceAlert } from "./webhook-alerts";
import type { SupplierProfile } from "./types";

// Strategic shipping routes and the countries they affect
const ROUTE_COUNTRY_MAP: Record<string, string[]> = {
  hormuz: ["IR", "SA", "AE", "KW", "QA", "BH", "OM", "IQ"],
  suez: ["EG", "IL", "SA", "AE", "IN", "CN", "JP", "KR"],
  malacca: ["SG", "MY", "ID", "CN", "JP", "KR", "TW", "TH", "VN"],
  bosporus: ["TR", "RU", "UA", "RO", "BG", "GE"],
  panama: ["US", "MX", "CO", "BR", "CL", "PE"],
  babel_mandeb: ["YE", "DJ", "ER", "SA", "EG"],
};

// Route keywords that trigger route-based impact
const ROUTE_KEYWORDS: Record<string, string[]> = {
  hormuz: ["hormuz", "persian gulf", "strait of hormuz"],
  suez: ["suez", "suez canal"],
  malacca: ["malacca", "strait of malacca"],
  bosporus: ["bosporus", "bosphorus", "turkish straits"],
  panama: ["panama canal"],
  babel_mandeb: ["bab el-mandeb", "babel mandeb", "red sea"],
};

export interface SupplyChainImpactResult {
  suppliersAffected: number;
  alertsCreated: number;
  webhooksSent: number;
}

/**
 * Called from ingestion pipeline when a CRITICAL/HIGH event is processed.
 * Finds all suppliers that could be impacted and generates alerts.
 */
export async function assessSupplyChainImpact(
  eventId: string,
  headline: string,
  description: string,
  countryCode: string | null,
  severity: string,
  category: string,
  riskScore: number,
): Promise<SupplyChainImpactResult> {
  const result: SupplyChainImpactResult = {
    suppliersAffected: 0,
    alertsCreated: 0,
    webhooksSent: 0,
  };

  const fullText = `${headline} ${description}`.toLowerCase();

  // 1. Find affected countries: direct country + route-affected countries
  const affectedCountries = new Set<string>();
  if (countryCode) affectedCountries.add(countryCode.toUpperCase());

  // Check for route disruptions
  const affectedRoutes: string[] = [];
  for (const [route, keywords] of Object.entries(ROUTE_KEYWORDS)) {
    if (keywords.some((kw) => fullText.includes(kw))) {
      affectedRoutes.push(route);
      for (const cc of ROUTE_COUNTRY_MAP[route] || []) {
        affectedCountries.add(cc);
      }
    }
  }

  if (affectedCountries.size === 0) return result;

  // 2. Find all suppliers in affected countries OR using affected routes
  const suppliers = await db.sentinelSupplier.findMany({
    where: {
      isActive: true,
      OR: [
        { countryCode: { in: [...affectedCountries] } },
        { dependsOnCountries: { hasSome: [...affectedCountries] } },
        ...(affectedRoutes.length > 0
          ? [{ shippingRoutes: { hasSome: affectedRoutes } }]
          : []),
      ],
    },
    include: {
      organization: {
        include: {
          members: {
            where: { isActive: true },
            select: { userId: true, role: true },
          },
        },
      },
    },
  });

  if (suppliers.length === 0) return result;

  result.suppliersAffected = suppliers.length;

  // 3. Re-score each supplier and generate impact alerts
  for (const supplier of suppliers) {
    const profile: SupplierProfile = {
      name: supplier.name,
      countryCode: supplier.countryCode,
      sector: supplier.sector,
      tier: supplier.tier,
      criticality: supplier.criticality as "critical" | "high" | "medium" | "low",
    };

    const assessment = assessSupplierRisk(profile);
    const previousScore = supplier.currentRiskScore;

    // Apply event severity boost: CRITICAL events in direct country get extra weight
    const isDirectCountry = supplier.countryCode === countryCode?.toUpperCase();
    const eventBoost = severity === "SENTINEL_CRITICAL"
      ? (isDirectCountry ? 25 : 15)
      : severity === "SENTINEL_HIGH"
        ? (isDirectCountry ? 15 : 8)
        : 0;

    const newScore = Math.min(100, assessment.compositeRisk + eventBoost);
    const riskChange = newScore - previousScore;

    // Only alert if risk actually increased
    if (riskChange <= 0) continue;

    // Determine alert type
    const alertType = affectedRoutes.length > 0 && supplier.shippingRoutes.some((r) => affectedRoutes.includes(r))
      ? "route_disruption"
      : isDirectCountry
        ? "country_impact"
        : supplier.dependsOnCountries.includes(countryCode?.toUpperCase() || "")
          ? "cascade_risk"
          : "country_impact";

    // Generate AI impact summary
    let impactSummary = `Risk increased from ${previousScore} to ${newScore} (+${riskChange}) due to: ${headline}`;
    let mitigations: { type: string; description: string; urgency: string }[] = [];
    let aiTokens = 0;

    // Use AI for significant risk changes (save API costs on small changes)
    if (riskChange >= 10 || newScore >= 60) {
      try {
        const aiResult = await analyzeEvent({
          headline: `SUPPLY CHAIN IMPACT: ${headline}`,
          content: `Assess the impact of this event on a supply chain supplier:\n\nSupplier: ${supplier.name}\nCountry: ${supplier.countryCode}\nSector: ${supplier.sector}\nCriticality: ${supplier.criticality}\nTier: ${supplier.tier}\nRoutes: ${supplier.shippingRoutes.join(", ") || "N/A"}\n\nEvent: ${headline}\n${description}\n\nProvide specific supply chain impact assessment and actionable mitigations.`,
          source: "Supply Chain Monitor",
          countryCode: supplier.countryCode,
        });

        impactSummary = aiResult.reasoning.whyItMatters || impactSummary;
        mitigations = (aiResult.actionableInsights || []).map((insight, i) => ({
          type: i === 0 ? "immediate" : i === 1 ? "short_term" : "medium_term",
          description: insight,
          urgency: newScore >= 80 ? "urgent" : newScore >= 60 ? "high" : "standard",
        }));
        aiTokens = aiResult.reasoningTokens;
      } catch {
        // AI failure is non-fatal — use basic mitigations
        mitigations = generateBasicMitigations(alertType, supplier.name, newScore);
      }
    } else {
      mitigations = generateBasicMitigations(alertType, supplier.name, newScore);
    }

    // Update supplier risk score
    const newLevel = newScore >= 70 ? "critical" : newScore >= 50 ? "high" : newScore >= 30 ? "medium" : "low";
    await db.sentinelSupplier.update({
      where: { id: supplier.id },
      data: {
        currentRiskScore: newScore,
        riskLevel: newLevel,
        lastAssessedAt: new Date(),
      },
    });

    // Create alert record
    await db.supplyChainAlert.create({
      data: {
        supplierId: supplier.id,
        eventId,
        alertType,
        previousRiskScore: previousScore,
        newRiskScore: newScore,
        riskChange,
        impactSummary,
        mitigations,
        aiTokensUsed: aiTokens,
      },
    });
    result.alertsCreated++;

    // Send webhook notification to org members
    for (const member of supplier.organization.members) {
      try {
        const payload = buildIntelligenceAlert({
          headline: `[SUPPLY CHAIN] ${supplier.name} risk ${previousScore}→${newScore}: ${headline}`,
          category: "supply_chain_impact",
          severity: newLevel,
          riskScore: newScore,
          countryCode: supplier.countryCode,
          source: "Supply Chain Monitor",
        });
        const results = await broadcastAlert(member.userId, payload);
        result.webhooksSent += results.filter((r) => r.success).length;
      } catch {
        // Webhook failure is non-fatal
      }
    }
  }

  if (result.alertsCreated > 0) {
    console.log(
      `[SupplyChain] Event ${eventId}: ${result.suppliersAffected} suppliers affected, ${result.alertsCreated} alerts, ${result.webhooksSent} webhooks`,
    );
  }

  return result;
}

function generateBasicMitigations(
  alertType: string,
  supplierName: string,
  riskScore: number,
): { type: string; description: string; urgency: string }[] {
  const urgency = riskScore >= 80 ? "urgent" : riskScore >= 60 ? "high" : "standard";
  const mitigations: { type: string; description: string; urgency: string }[] = [];

  if (alertType === "route_disruption") {
    mitigations.push(
      { type: "immediate", description: `Identify alternative shipping routes for ${supplierName} — primary route may be disrupted`, urgency },
      { type: "short_term", description: `Review safety stock levels and consider emergency procurement from alternative suppliers`, urgency },
    );
  } else if (alertType === "country_impact") {
    mitigations.push(
      { type: "immediate", description: `Contact ${supplierName} to confirm operational status and delivery timeline`, urgency },
      { type: "short_term", description: `Activate contingency supplier list for ${supplierName}'s products/services`, urgency },
    );
  } else {
    mitigations.push(
      { type: "immediate", description: `Monitor upstream supply chain for ${supplierName} — cascade risk detected`, urgency },
      { type: "short_term", description: `Map full sub-tier dependency chain and identify alternative upstream sources`, urgency },
    );
  }

  if (riskScore >= 70) {
    mitigations.push(
      { type: "medium_term", description: `Diversify sourcing: qualify alternative suppliers in lower-risk jurisdictions`, urgency: "high" },
    );
  }

  return mitigations;
}
