// ============================================
// SENTINEL — Financial Crime Screening Engine
// ============================================

import type {
  ScreeningRequest,
  ComprehensiveScreeningResult,
  SanctionsMatch,
  PEPMatch,
  AdverseMediaHit,
  ScreeningRecommendation,
} from "./types";

// High-risk countries (FATF grey/black list + conflict zones)
const HIGH_RISK_COUNTRIES = new Set([
  "IR", "KP", "SY", "CU", "RU", "BY", "VE", "MM", "AF",
  "IQ", "LY", "SO", "SD", "YE", "ZW", "CD", "CF", "SS",
  "ML", "BF", "NI", "HT", "LB",
]);

const MEDIUM_RISK_COUNTRIES = new Set([
  "PK", "NG", "KE", "TZ", "UG", "BD", "KH", "LA", "VN",
  "TH", "PH", "ID", "EG", "JO", "SA", "AE", "QA", "BH",
  "OM", "KW", "TR", "RS", "BA", "AL", "ME", "MK", "XK",
]);

// ---- OpenSanctions Client ----

export async function searchOpenSanctions(
  name: string,
  entityType: string
): Promise<SanctionsMatch[]> {
  const apiKey = process.env.OPENSANCTIONS_API_KEY;
  const baseUrl =
    process.env.OPENSANCTIONS_BASE_URL || "https://api.opensanctions.org";

  if (!apiKey) {
    console.warn("[Sentinel] OpenSanctions API key not configured");
    return [];
  }

  const schemaType = entityType === "person" ? "Person" : "Organization";

  const response = await fetch(`${baseUrl}/match/default`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `ApiKey ${apiKey}`,
    },
    body: JSON.stringify({
      queries: {
        sentinel_query: {
          schema: schemaType,
          properties: { name: [name] },
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenSanctions API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const results = data.responses?.sentinel_query?.results || [];

  return results.map(
    (r: {
      id: string;
      caption: string;
      score: number;
      datasets: string[];
      properties?: { listingDate?: string[] };
    }) => ({
      listName: (r.datasets || []).join(", "),
      matchedName: r.caption || name,
      score: normalizeScore(r.score || 0),
      entityId: r.id || "",
      sanctionPrograms: r.datasets || [],
      listingDate: r.properties?.listingDate?.[0],
    })
  );
}

// ---- Fuzzy Name Matching ----

export function calculateNameSimilarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();

  const na = normalize(a);
  const nb = normalize(b);

  if (na === nb) return 1;
  if (!na || !nb) return 0;

  // Levenshtein distance-based similarity
  const distance = levenshteinDistance(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  const similarity = 1 - distance / maxLen;

  // Token overlap bonus
  const tokensA = new Set(na.split(/\s+/));
  const tokensB = new Set(nb.split(/\s+/));
  const intersection = [...tokensA].filter((t) => tokensB.has(t)).length;
  const union = new Set([...tokensA, ...tokensB]).size;
  const jaccard = union > 0 ? intersection / union : 0;

  return Math.min(1, similarity * 0.6 + jaccard * 0.4);
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Optimization: use single array instead of matrix
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  const curr = new Array(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    prev = [...curr];
  }

  return prev[n];
}

// ---- Geographic Risk ----

export function calculateGeographicRisk(countryCode?: string): number {
  if (!countryCode) return 20; // Unknown = moderate baseline

  const code = countryCode.toUpperCase();
  if (HIGH_RISK_COUNTRIES.has(code)) return 85;
  if (MEDIUM_RISK_COUNTRIES.has(code)) return 45;
  return 10;
}

// ---- Composite Screening ----

export async function screenEntity(
  request: ScreeningRequest
): Promise<ComprehensiveScreeningResult> {
  // Run screening checks in parallel
  const [sanctionsMatches, geographicRiskScore] = await Promise.all([
    searchOpenSanctions(request.name, request.entityType).catch((err) => {
      console.error("[Sentinel Screening] Sanctions search failed:", err);
      return [] as SanctionsMatch[];
    }),
    Promise.resolve(calculateGeographicRisk(request.countryCode)),
  ]);

  // Calculate sanctions score
  const sanctionsScore = sanctionsMatches.length > 0
    ? Math.min(100, Math.max(...sanctionsMatches.map((m) => m.score)))
    : 0;

  // PEP detection (simplified — in production, use dedicated PEP database)
  const pepMatches: PEPMatch[] = [];
  const pepScore = pepMatches.length > 0
    ? Math.min(100, Math.max(...pepMatches.map((m) => m.score)))
    : 0;

  // Adverse media (placeholder — in production, integrate GDELT)
  const adverseMediaHits: AdverseMediaHit[] = [];
  const adverseMediaScore = 0;

  // Composite score: 50% sanctions + 20% PEP + 25% adverse media + 5% geography
  const compositeScore = Math.round(
    sanctionsScore * 0.5 +
    pepScore * 0.2 +
    adverseMediaScore * 0.25 +
    geographicRiskScore * 0.05
  );

  const recommendation = determineRecommendation(compositeScore, sanctionsScore);

  const riskFactors = buildRiskFactors(
    sanctionsScore,
    pepScore,
    adverseMediaScore,
    geographicRiskScore,
    request.countryCode
  );

  return {
    entityName: request.name,
    entityType: request.entityType,
    sanctionsScore,
    pepScore,
    adverseMediaScore,
    geographicRiskScore,
    compositeScore,
    recommendation,
    sanctionsMatches,
    pepMatches,
    adverseMediaHits,
    riskFactors,
    screenedAt: new Date().toISOString(),
  };
}

function determineRecommendation(
  compositeScore: number,
  sanctionsScore: number
): ScreeningRecommendation {
  // Direct sanctions hit always blocks
  if (sanctionsScore >= 90) return "block";
  if (compositeScore >= 75) return "block";
  if (compositeScore >= 40) return "enhanced_due_diligence";
  if (compositeScore >= 15) return "standard";
  return "clear";
}

function buildRiskFactors(
  sanctionsScore: number,
  pepScore: number,
  adverseMediaScore: number,
  geographicRiskScore: number,
  countryCode?: string
): string[] {
  const factors: string[] = [];

  if (sanctionsScore >= 70) factors.push("High sanctions match confidence");
  else if (sanctionsScore >= 40) factors.push("Moderate sanctions match detected");

  if (pepScore >= 50) factors.push("Politically Exposed Person match");

  if (adverseMediaScore >= 50) factors.push("Significant adverse media coverage");

  if (geographicRiskScore >= 70) {
    factors.push(`High-risk jurisdiction (${countryCode})`);
  } else if (geographicRiskScore >= 40) {
    factors.push(`Medium-risk jurisdiction (${countryCode})`);
  }

  if (factors.length === 0) {
    factors.push("No significant risk factors identified");
  }

  return factors;
}

function normalizeScore(raw: number): number {
  // OpenSanctions returns 0-1 scores, normalize to 0-100
  if (raw <= 1) return Math.round(raw * 100);
  return Math.min(100, Math.round(raw));
}
