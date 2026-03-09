// ============================================
// SENTINEL — Financial Crime Screening Engine
// OFAC SDN + 50% Rule + PEP + Adverse Media
// ============================================

import type {
  ScreeningRequest,
  ComprehensiveScreeningResult,
  SanctionsMatch,
  PEPMatch,
  AdverseMediaHit,
  ScreeningRecommendation,
  OwnershipLink,
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

// OFAC-specific dataset identifiers in OpenSanctions
const OFAC_DATASETS = new Set([
  "us_ofac_sdn",
  "us_ofac_cons",
  "us_trade_csl",
  "us_bis_denied",
]);

const PEP_DATASETS = new Set([
  "everypolitician",
  "wd_peps",
  "ru_rupep",
  "ua_nacp_declarations",
  "us_cia_world_leaders",
  "interpol_red_notices",
]);

// ---- OpenSanctions Client ----

interface OpenSanctionsEntity {
  id: string;
  caption: string;
  score: number;
  datasets: string[];
  schema: string;
  properties?: {
    name?: string[];
    listingDate?: string[];
    position?: string[];
    country?: string[];
    topics?: string[];
    birthDate?: string[];
    nationality?: string[];
    ownershipOwner?: string[];    // Entity IDs of owners
    ownershipAsset?: string[];    // Entity IDs of owned assets
    sharesValue?: string[];
    percentage?: string[];
  };
}

interface OpenSanctionsMatchResponse {
  responses: {
    [key: string]: {
      results: OpenSanctionsEntity[];
      total: { value: number };
    };
  };
}

function getApiConfig() {
  const apiKey = process.env.OPENSANCTIONS_API_KEY;
  const baseUrl = process.env.OPENSANCTIONS_BASE_URL || "https://api.opensanctions.org";
  return { apiKey, baseUrl };
}

export async function searchOpenSanctions(
  name: string,
  entityType: string,
  options?: {
    countryCode?: string;
    dateOfBirth?: string;
    nationality?: string;
  }
): Promise<OpenSanctionsEntity[]> {
  const { apiKey, baseUrl } = getApiConfig();

  if (!apiKey) {
    console.warn("[Sentinel] OpenSanctions API key not configured — set OPENSANCTIONS_API_KEY");
    return [];
  }

  const schemaType =
    entityType === "person" ? "Person"
    : entityType === "vessel" ? "Vessel"
    : entityType === "aircraft" ? "Airplane"
    : "Organization";

  // Build properties with available context
  const properties: Record<string, string[]> = { name: [name] };
  if (options?.countryCode) properties.country = [options.countryCode];
  if (options?.dateOfBirth) properties.birthDate = [options.dateOfBirth];
  if (options?.nationality) properties.nationality = [options.nationality];

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
          properties,
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenSanctions API error ${response.status}: ${text}`);
  }

  const data: OpenSanctionsMatchResponse = await response.json();
  return data.responses?.sentinel_query?.results || [];
}

// ---- OFAC SDN Specific Matching ----

function extractSanctionsMatches(entities: OpenSanctionsEntity[]): SanctionsMatch[] {
  return entities
    .filter((e) => e.score > 0.4) // Only meaningful matches
    .map((e) => {
      const isOFAC = e.datasets.some((d) => OFAC_DATASETS.has(d));
      return {
        listName: e.datasets.join(", "),
        matchedName: e.caption || "",
        score: normalizeScore(e.score),
        entityId: e.id || "",
        sanctionPrograms: e.datasets,
        listingDate: e.properties?.listingDate?.[0],
        isOFAC,
      };
    });
}

// ---- 50% Rule Ownership Analysis ----

async function analyzeOwnershipChain(
  entityName: string,
  entityType: string
): Promise<{ blocked: boolean; ownershipLinks: OwnershipLink[]; aggregateSDNOwnership: number }> {
  const { apiKey, baseUrl } = getApiConfig();

  if (!apiKey) {
    return { blocked: false, ownershipLinks: [], aggregateSDNOwnership: 0 };
  }

  // Search for ownership relationships
  const schemaType = entityType === "person" ? "Person" : "Organization";

  try {
    const response = await fetch(`${baseUrl}/match/default`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `ApiKey ${apiKey}`,
      },
      body: JSON.stringify({
        queries: {
          ownership_query: {
            schema: schemaType,
            properties: { name: [entityName] },
          },
        },
      }),
    });

    if (!response.ok) return { blocked: false, ownershipLinks: [], aggregateSDNOwnership: 0 };

    const data: OpenSanctionsMatchResponse = await response.json();
    const results = data.responses?.ownership_query?.results || [];

    const ownershipLinks: OwnershipLink[] = [];
    let aggregateSDNOwnership = 0;

    for (const entity of results) {
      if (entity.score < 0.7) continue; // Only high-confidence matches

      // Check if any listed owner is an SDN
      const ownerIds = entity.properties?.ownershipOwner || [];
      const percentages = entity.properties?.percentage || [];

      for (let i = 0; i < ownerIds.length; i++) {
        // Check if the owner entity is on the SDN list
        const ownerDatasets = entity.datasets || [];
        const isSDN = ownerDatasets.some((d) => OFAC_DATASETS.has(d));

        if (isSDN) {
          const pct = percentages[i] ? parseFloat(percentages[i]) : 0;
          aggregateSDNOwnership += pct;

          ownershipLinks.push({
            ownerName: entity.caption || ownerIds[i],
            ownerEntityId: ownerIds[i],
            ownershipPercentage: pct,
            isSDN: true,
            listName: ownerDatasets.filter((d) => OFAC_DATASETS.has(d)).join(", "),
          });
        }
      }

      // Also check if this entity itself has topics indicating sanctions
      const topics = entity.properties?.topics || [];
      if (topics.includes("sanction") && entity.datasets.some((d) => OFAC_DATASETS.has(d))) {
        // The entity itself is sanctioned — direct match, not ownership
        if (!ownershipLinks.some((l) => l.ownerEntityId === entity.id)) {
          ownershipLinks.push({
            ownerName: entity.caption,
            ownerEntityId: entity.id,
            ownershipPercentage: 100,
            isSDN: true,
            listName: entity.datasets.filter((d) => OFAC_DATASETS.has(d)).join(", "),
          });
          aggregateSDNOwnership = 100;
        }
      }
    }

    // OFAC 50% Rule: blocked if aggregate SDN ownership >= 50%
    const blocked = aggregateSDNOwnership >= 50;

    return { blocked, ownershipLinks, aggregateSDNOwnership };
  } catch (err) {
    console.error("[Sentinel] Ownership chain analysis failed:", err);
    return { blocked: false, ownershipLinks: [], aggregateSDNOwnership: 0 };
  }
}

// ---- PEP Detection ----

function extractPEPMatches(entities: OpenSanctionsEntity[]): PEPMatch[] {
  return entities
    .filter((e) => {
      // Entity is a PEP if it comes from PEP datasets or has pep topic
      const isPEPDataset = e.datasets.some((d) => PEP_DATASETS.has(d));
      const hasPEPTopic = e.properties?.topics?.includes("role.pep") || false;
      return (isPEPDataset || hasPEPTopic) && e.score > 0.5;
    })
    .map((e) => ({
      name: e.caption || "",
      position: e.properties?.position?.[0] || "Public official",
      country: e.properties?.country?.[0] || "Unknown",
      score: normalizeScore(e.score),
      level: determinePEPLevel(e.properties?.position?.[0]),
    }));
}

function determinePEPLevel(
  position?: string
): "national" | "regional" | "local" {
  if (!position) return "national";
  const lower = position.toLowerCase();
  if (
    lower.includes("president") ||
    lower.includes("prime minister") ||
    lower.includes("minister") ||
    lower.includes("senator") ||
    lower.includes("ambassador") ||
    lower.includes("central bank") ||
    lower.includes("supreme court")
  ) {
    return "national";
  }
  if (
    lower.includes("governor") ||
    lower.includes("state") ||
    lower.includes("provincial")
  ) {
    return "regional";
  }
  return "local";
}

// ---- Adverse Media via OpenSanctions ----

function extractAdverseMedia(entities: OpenSanctionsEntity[]): AdverseMediaHit[] {
  return entities
    .filter((e) => {
      const topics = e.properties?.topics || [];
      return (
        topics.includes("crime") ||
        topics.includes("crime.fin") ||
        topics.includes("crime.terror") ||
        topics.includes("wanted")
      ) && e.score > 0.5;
    })
    .map((e) => ({
      title: `${e.caption} — linked to ${(e.properties?.topics || []).join(", ")}`,
      source: e.datasets.join(", "),
      date: e.properties?.listingDate?.[0] || new Date().toISOString(),
      relevanceScore: normalizeScore(e.score),
      summary: `Entity appears in ${e.datasets.length} watchlist(s): ${e.datasets.join(", ")}`,
    }));
}

// ---- Fuzzy Name Matching ----

export function calculateNameSimilarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();

  const na = normalize(a);
  const nb = normalize(b);

  if (na === nb) return 1;
  if (!na || !nb) return 0;

  const distance = levenshteinDistance(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  const similarity = 1 - distance / maxLen;

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
  if (!countryCode) return 20;

  const code = countryCode.toUpperCase();
  if (HIGH_RISK_COUNTRIES.has(code)) return 85;
  if (MEDIUM_RISK_COUNTRIES.has(code)) return 45;
  return 10;
}

// ---- Composite Screening (Main Entry Point) ----

export async function screenEntity(
  request: ScreeningRequest
): Promise<ComprehensiveScreeningResult> {
  // Run all screening checks in parallel
  const [rawEntities, ownershipResult, geographicRiskScore] = await Promise.all([
    searchOpenSanctions(request.name, request.entityType, {
      countryCode: request.countryCode,
      dateOfBirth: request.dateOfBirth,
      nationality: request.nationality,
    }).catch((err) => {
      console.error("[Sentinel Screening] OpenSanctions search failed:", err);
      return [] as OpenSanctionsEntity[];
    }),
    analyzeOwnershipChain(request.name, request.entityType).catch((err) => {
      console.error("[Sentinel Screening] Ownership analysis failed:", err);
      return { blocked: false, ownershipLinks: [] as OwnershipLink[], aggregateSDNOwnership: 0 };
    }),
    Promise.resolve(calculateGeographicRisk(request.countryCode)),
  ]);

  // Extract different types of matches from the unified OpenSanctions results
  const sanctionsMatches = extractSanctionsMatches(rawEntities);
  const pepMatches = extractPEPMatches(rawEntities);
  const adverseMediaHits = extractAdverseMedia(rawEntities);

  // Annotate sanctions matches with 50% Rule ownership data
  if (ownershipResult.blocked) {
    // Add ownership flag to existing matches or create a new one
    const hasOFACMatch = sanctionsMatches.some((m) => m.isOFAC);
    if (!hasOFACMatch && ownershipResult.ownershipLinks.length > 0) {
      sanctionsMatches.push({
        listName: "OFAC SDN (50% Rule — Blocked by Ownership)",
        matchedName: request.name,
        score: 95,
        entityId: "",
        sanctionPrograms: ["us_ofac_sdn"],
        isOFAC: true,
        ownershipFlag: true,
        ownershipDetails: ownershipResult.ownershipLinks,
      });
    } else {
      // Annotate existing OFAC matches
      for (const match of sanctionsMatches) {
        if (match.isOFAC) {
          match.ownershipFlag = true;
          match.ownershipDetails = ownershipResult.ownershipLinks;
        }
      }
    }
  }

  // Calculate component scores
  const sanctionsScore = sanctionsMatches.length > 0
    ? Math.min(100, Math.max(...sanctionsMatches.map((m) => m.score)))
    : 0;

  // Boost sanctions score if blocked via 50% Rule
  const effectiveSanctionsScore = ownershipResult.blocked
    ? Math.max(sanctionsScore, 95)
    : sanctionsScore;

  const pepScore = pepMatches.length > 0
    ? Math.min(100, Math.max(...pepMatches.map((m) => m.score)))
    : 0;

  const adverseMediaScore = adverseMediaHits.length > 0
    ? Math.min(100, Math.max(...adverseMediaHits.map((h) => h.relevanceScore)))
    : 0;

  // Composite score: 50% sanctions + 20% PEP + 25% adverse media + 5% geography
  const compositeScore = Math.round(
    effectiveSanctionsScore * 0.5 +
    pepScore * 0.2 +
    adverseMediaScore * 0.25 +
    geographicRiskScore * 0.05
  );

  const recommendation = determineRecommendation(compositeScore, effectiveSanctionsScore, ownershipResult.blocked);

  const riskFactors = buildRiskFactors(
    effectiveSanctionsScore,
    pepScore,
    adverseMediaScore,
    geographicRiskScore,
    request.countryCode,
    ownershipResult,
    sanctionsMatches
  );

  return {
    entityName: request.name,
    entityType: request.entityType,
    sanctionsScore: effectiveSanctionsScore,
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
  sanctionsScore: number,
  blockedByOwnership: boolean
): ScreeningRecommendation {
  // 50% Rule: entity blocked by SDN ownership → always block
  if (blockedByOwnership) return "block";
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
  countryCode: string | undefined,
  ownershipResult: { blocked: boolean; aggregateSDNOwnership: number; ownershipLinks: OwnershipLink[] },
  sanctionsMatches: SanctionsMatch[]
): string[] {
  const factors: string[] = [];

  // OFAC-specific factors
  const ofacMatches = sanctionsMatches.filter((m) => m.isOFAC);
  if (ofacMatches.length > 0) {
    factors.push(`OFAC SDN list match (${ofacMatches.length} hit${ofacMatches.length > 1 ? "s" : ""})`);
    for (const m of ofacMatches.slice(0, 3)) {
      factors.push(`  — ${m.matchedName} (${m.score}% confidence, ${m.sanctionPrograms.join(", ")})`);
    }
  }

  // 50% Rule
  if (ownershipResult.blocked) {
    factors.push(
      `OFAC 50% Rule: Aggregate SDN ownership ${ownershipResult.aggregateSDNOwnership.toFixed(0)}% — ENTITY BLOCKED`
    );
    for (const link of ownershipResult.ownershipLinks.slice(0, 5)) {
      factors.push(
        `  — ${link.ownerName}: ${link.ownershipPercentage}% ownership (${link.listName})`
      );
    }
  } else if (ownershipResult.aggregateSDNOwnership > 0) {
    factors.push(
      `SDN ownership detected: ${ownershipResult.aggregateSDNOwnership.toFixed(0)}% (below 50% threshold)`
    );
  }

  // Non-OFAC sanctions
  const nonOfacMatches = sanctionsMatches.filter((m) => !m.isOFAC);
  if (nonOfacMatches.length > 0) {
    factors.push(`Other sanctions lists: ${nonOfacMatches.map((m) => m.listName).join("; ")}`);
  }

  // General sanctions
  if (sanctionsScore >= 70 && ofacMatches.length === 0) {
    factors.push("High sanctions match confidence");
  } else if (sanctionsScore >= 40 && ofacMatches.length === 0) {
    factors.push("Moderate sanctions match detected");
  }

  // PEP
  if (pepScore >= 50) factors.push("Politically Exposed Person (PEP) match detected");

  // Adverse media
  if (adverseMediaScore >= 50) factors.push("Significant adverse media / criminal watchlist hit");

  // Geography
  if (geographicRiskScore >= 70) {
    factors.push(`High-risk jurisdiction: ${countryCode} (FATF blacklist / conflict zone)`);
  } else if (geographicRiskScore >= 40) {
    factors.push(`Medium-risk jurisdiction: ${countryCode}`);
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
