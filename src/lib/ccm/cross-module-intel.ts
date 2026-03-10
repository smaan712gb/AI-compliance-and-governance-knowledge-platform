import { db } from "@/lib/db";

// ============================================
// Cross-Module Intelligence Engine
// Links CCM compliance findings with Sentinel geopolitical events
// Enables: "This sanctions finding is connected to a new OFAC designation"
// ============================================

export interface CrossModuleCorrelation {
  ccmFindingId: string;
  sentinelEventId: string;
  correlationType:
    | "SANCTIONS_MATCH"
    | "REGULATORY_CHANGE"
    | "GEOPOLITICAL_RISK"
    | "SUPPLY_CHAIN_IMPACT"
    | "COUNTRY_RISK"
    | "ENTITY_OVERLAP";
  confidence: number;
  description: string;
  actionRequired: boolean;
  suggestedAction?: string;
}

export interface CrossModuleReport {
  organizationId: string;
  correlationsFound: number;
  correlations: CrossModuleCorrelation[];
  riskElevations: {
    findingId: string;
    originalSeverity: string;
    recommendedSeverity: string;
    reason: string;
  }[];
  newRisks: {
    eventId: string;
    potentialImpact: string;
    recommendedAction: string;
  }[];
}

// ---- Helpers ----

/** Extract keywords from text (lowercased, deduplicated, min 3 chars) */
function extractKeywords(text: string): Set<string> {
  const stopWords = new Set([
    "the", "and", "for", "that", "this", "with", "from", "have", "has",
    "been", "are", "was", "were", "will", "can", "may", "not", "but",
    "its", "all", "any", "each", "than", "into", "over", "also",
  ]);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));
  return new Set(words);
}

/** Compute Jaccard similarity between two keyword sets */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/** Check if two sets of country codes overlap */
function countryOverlap(
  countries1: string[],
  countries2: string[]
): string[] {
  const set1 = new Set(countries1.map((c) => c.toUpperCase()));
  return countries2.filter((c) => set1.has(c.toUpperCase()));
}

/** Map event category to potential finding frameworks */
function categoryToFrameworks(
  category: string
): string[] {
  const mapping: Record<string, string[]> = {
    SANCTIONS: ["AML_BSA", "CUSTOM"],
    POLITICAL: ["CUSTOM", "SOX", "GDPR"],
    ECONOMIC: ["SOX", "AML_BSA", "CUSTOM"],
    CYBER: ["ISO_27001", "NIST_CSF", "PCI_DSS"],
    CONFLICT: ["AML_BSA", "CUSTOM"],
    TERRORISM: ["AML_BSA", "CUSTOM"],
    DISASTER: ["CUSTOM"],
    OTHER: ["CUSTOM"],
  };
  return mapping[category] ?? ["CUSTOM"];
}

const SEVERITY_ORDER = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

function elevateSeverity(
  current: string,
  steps: number
): string {
  const idx = SEVERITY_ORDER.indexOf(
    current as (typeof SEVERITY_ORDER)[number]
  );
  if (idx === -1) return current;
  const newIdx = Math.min(idx + steps, SEVERITY_ORDER.length - 1);
  return SEVERITY_ORDER[newIdx];
}

// ---- Core Functions ----

/** Run cross-module correlation analysis */
export async function runCrossModuleAnalysis(
  organizationId: string
): Promise<CrossModuleReport> {
  // Fetch recent findings and events in parallel
  const [findings, events] = await Promise.all([
    db.finding.findMany({
      where: {
        organizationId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.intelligenceEvent.findMany({
      where: {
        processedAt: { gte: new Date(Date.now() - 30 * 86_400_000) },
        category: {
          in: ["SANCTIONS", "POLITICAL", "ECONOMIC", "CYBER", "CONFLICT"],
        },
      },
      orderBy: { processedAt: "desc" },
      take: 500,
    }),
  ]);

  const correlations: CrossModuleCorrelation[] = [];
  const riskElevations: CrossModuleReport["riskElevations"] = [];
  const newRisks: CrossModuleReport["newRisks"] = [];
  const processedPairs = new Set<string>();

  for (const finding of findings) {
    const findingKeywords = extractKeywords(
      `${finding.title} ${finding.description}`
    );
    const findingCountries = extractCountryCodes(
      `${finding.title} ${finding.description}`
    );

    for (const event of events) {
      const pairKey = `${finding.id}::${event.id}`;
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const eventKeywords = extractKeywords(
        `${event.headline} ${event.summary}`
      );
      const similarity = jaccardSimilarity(findingKeywords, eventKeywords);

      // Entity overlap check
      const eventEntities = event.entities ?? [];
      const findingText = `${finding.title} ${finding.description}`.toLowerCase();
      const entityMatches = eventEntities.filter(
        (e) => e.length >= 3 && findingText.includes(e.toLowerCase())
      );

      // Country overlap
      const eventCountry = event.countryCode ? [event.countryCode] : [];
      const sharedCountries = countryOverlap(findingCountries, eventCountry);

      // Framework relevance
      const relevantFrameworks = categoryToFrameworks(event.category);
      const frameworkMatch = relevantFrameworks.includes(finding.framework);

      // Determine correlation type and confidence
      let correlationType: CrossModuleCorrelation["correlationType"] | null = null;
      let confidence = 0;
      let description = "";
      let actionRequired = false;
      let suggestedAction: string | undefined;

      // Sanctions match: sanctions event + AML finding + entity/country overlap
      if (
        event.category === "SANCTIONS" &&
        (finding.framework === "AML_BSA" || finding.framework === "CUSTOM") &&
        (entityMatches.length > 0 || sharedCountries.length > 0)
      ) {
        correlationType = "SANCTIONS_MATCH";
        confidence = Math.min(
          95,
          50 + entityMatches.length * 20 + sharedCountries.length * 15
        );
        description = `Sanctions event "${event.headline}" matches finding entities: ${entityMatches.length > 0 ? entityMatches.join(", ") : sharedCountries.join(", ")}`;
        actionRequired = true;
        suggestedAction =
          "Immediately review finding against latest sanctions designation. Update screening lists and re-run AML checks.";
      }
      // Regulatory change
      else if (
        event.category === "POLITICAL" &&
        frameworkMatch &&
        similarity > 0.08
      ) {
        correlationType = "REGULATORY_CHANGE";
        confidence = Math.min(85, Math.round(similarity * 400 + 20));
        description = `Political event "${event.headline}" may affect ${finding.framework} compliance (keyword similarity: ${(similarity * 100).toFixed(0)}%)`;
        actionRequired = confidence > 60;
        suggestedAction =
          "Review if the regulatory change requires rule updates or additional controls.";
      }
      // Entity overlap
      else if (entityMatches.length > 0 && similarity > 0.05) {
        correlationType = "ENTITY_OVERLAP";
        confidence = Math.min(
          90,
          40 + entityMatches.length * 15 + Math.round(similarity * 200)
        );
        description = `Shared entities between finding and event: ${entityMatches.join(", ")}`;
        actionRequired = event.riskScore > 70;
        suggestedAction = `Investigate entity connections. Event risk score: ${event.riskScore}/100.`;
      }
      // Country risk
      else if (sharedCountries.length > 0 && event.riskScore > 60) {
        correlationType = "COUNTRY_RISK";
        confidence = Math.min(
          80,
          30 + sharedCountries.length * 20 + Math.round(event.riskScore / 5)
        );
        description = `Finding references country ${sharedCountries.join(", ")} which has elevated risk (score: ${event.riskScore})`;
        actionRequired = event.riskScore > 80;
        suggestedAction = `Increase monitoring for ${sharedCountries.join(", ")} related transactions.`;
      }
      // Supply chain impact
      else if (
        event.category === "ECONOMIC" &&
        similarity > 0.1 &&
        (findingText.includes("supply") ||
          findingText.includes("vendor") ||
          findingText.includes("supplier"))
      ) {
        correlationType = "SUPPLY_CHAIN_IMPACT";
        confidence = Math.min(75, Math.round(similarity * 300 + 20));
        description = `Economic event "${event.headline}" may impact supply chain compliance`;
        actionRequired = event.riskScore > 60;
        suggestedAction =
          "Review vendor and supply chain controls against economic disruption.";
      }
      // General geopolitical risk
      else if (similarity > 0.12 && frameworkMatch) {
        correlationType = "GEOPOLITICAL_RISK";
        confidence = Math.min(70, Math.round(similarity * 300 + 10));
        description = `Geopolitical event "${event.headline}" may be related to finding (similarity: ${(similarity * 100).toFixed(0)}%)`;
        actionRequired = false;
        suggestedAction = "Monitor for further developments.";
      }

      if (correlationType && confidence >= 30) {
        correlations.push({
          ccmFindingId: finding.id,
          sentinelEventId: event.id,
          correlationType,
          confidence,
          description,
          actionRequired,
          suggestedAction,
        });

        // Recommend risk elevation for high-confidence correlations
        if (confidence >= 70 && event.riskScore > 60) {
          const steps =
            event.riskScore > 80 ? 2 : event.riskScore > 60 ? 1 : 0;
          if (steps > 0) {
            const recommended = elevateSeverity(finding.severity, steps);
            if (recommended !== finding.severity) {
              riskElevations.push({
                findingId: finding.id,
                originalSeverity: finding.severity,
                recommendedSeverity: recommended,
                reason: `Correlated with ${correlationType} event (risk score ${event.riskScore}, confidence ${confidence}%)`,
              });
            }
          }
        }
      }
    }
  }

  // Identify events with no finding matches that may represent new risks
  const matchedEventIds = new Set(correlations.map((c) => c.sentinelEventId));
  const unmatchedHighRiskEvents = events.filter(
    (e) => !matchedEventIds.has(e.id) && e.riskScore > 70
  );

  for (const event of unmatchedHighRiskEvents.slice(0, 20)) {
    const relevantFrameworks = categoryToFrameworks(event.category);
    newRisks.push({
      eventId: event.id,
      potentialImpact: `${event.category} event "${event.headline}" (risk score ${event.riskScore}) may affect ${relevantFrameworks.join(", ")} compliance`,
      recommendedAction: `Create monitoring rule for ${event.category.toLowerCase()} events in ${event.countryName || event.countryCode || "affected region"}. Review current ${relevantFrameworks[0]} controls.`,
    });
  }

  return {
    organizationId,
    correlationsFound: correlations.length,
    correlations: correlations.sort((a, b) => b.confidence - a.confidence),
    riskElevations,
    newRisks,
  };
}

/** Extract possible ISO-2 country codes from text */
function extractCountryCodes(text: string): string[] {
  // Common country name-to-code mapping for compliance contexts
  const countryMap: Record<string, string> = {
    "united states": "US", usa: "US", america: "US",
    "united kingdom": "GB", uk: "GB", britain: "GB",
    china: "CN", chinese: "CN", russia: "RU", russian: "RU",
    iran: "IR", iranian: "IR", "north korea": "KP", dprk: "KP",
    syria: "SY", syrian: "SY", cuba: "CU", cuban: "CU",
    venezuela: "VE", myanmar: "MM", burma: "MM",
    germany: "DE", france: "FR", japan: "JP",
    ukraine: "UA", ukrainian: "UA", taiwan: "TW",
    india: "IN", brazil: "BR", mexico: "MX",
    "saudi arabia": "SA", turkey: "TR", israel: "IL",
    pakistan: "PK", afghanistan: "AF", iraq: "IQ",
    libya: "LY", libyan: "LY", yemen: "YE", yemeni: "YE",
    somalia: "SO", sudan: "SD", belarus: "BY",
    "hong kong": "HK", singapore: "SG", switzerland: "CH",
    "european union": "EU", europe: "EU",
  };

  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const [name, code] of Object.entries(countryMap)) {
    if (lower.includes(name)) {
      found.push(code);
    }
  }

  // Also look for explicit 2-letter codes in parentheses or after "country:"
  const codeMatches = text.match(/\b([A-Z]{2})\b/g);
  if (codeMatches) {
    const validCodes = new Set(Object.values(countryMap));
    for (const code of codeMatches) {
      if (validCodes.has(code)) found.push(code);
    }
  }

  return [...new Set(found)];
}

/** Check if a Sentinel event impacts CCM findings */
export async function checkEventImpact(
  eventId: string,
  organizationId: string
): Promise<{
  impactsFound: number;
  affectedFindings: string[];
  recommendations: string[];
}> {
  const [event, findings] = await Promise.all([
    db.intelligenceEvent.findUnique({ where: { id: eventId } }),
    db.finding.findMany({
      where: {
        organizationId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
      take: 500,
    }),
  ]);

  if (!event) {
    return { impactsFound: 0, affectedFindings: [], recommendations: [] };
  }

  const eventKeywords = extractKeywords(`${event.headline} ${event.summary}`);
  const eventEntities = (event.entities ?? []).map((e) => e.toLowerCase());
  const eventCountry = event.countryCode?.toUpperCase() ?? "";
  const recommendations: string[] = [];
  const affectedFindings: string[] = [];

  for (const finding of findings) {
    const findingText = `${finding.title} ${finding.description}`.toLowerCase();
    const findingKeywords = extractKeywords(findingText);

    // Check entity overlap
    const entityMatch = eventEntities.some(
      (e) => e.length >= 3 && findingText.includes(e)
    );

    // Check country overlap
    const findingCountries = extractCountryCodes(findingText);
    const countryMatch =
      eventCountry.length > 0 &&
      findingCountries.some((c) => c === eventCountry);

    // Keyword similarity
    const sim = jaccardSimilarity(eventKeywords, findingKeywords);

    // Framework relevance
    const relevantFrameworks = categoryToFrameworks(event.category);
    const frameworkMatch = relevantFrameworks.includes(finding.framework);

    const isImpacted =
      entityMatch ||
      (countryMatch && frameworkMatch) ||
      (sim > 0.1 && frameworkMatch);

    if (isImpacted) {
      affectedFindings.push(finding.id);
    }
  }

  // Generate recommendations based on event category
  if (affectedFindings.length > 0) {
    if (event.category === "SANCTIONS") {
      recommendations.push(
        "Re-run sanctions screening for all affected entities",
        "Update internal watchlists with new designations",
        "Review transaction monitoring rules for affected jurisdictions"
      );
    } else if (event.category === "CYBER") {
      recommendations.push(
        "Review access controls and authentication mechanisms",
        "Check if affected systems or vendors are in scope",
        "Update incident response procedures"
      );
    } else if (event.category === "POLITICAL" || event.category === "ECONOMIC") {
      recommendations.push(
        "Assess regulatory change impact on current compliance controls",
        "Review affected jurisdiction exposure",
        "Update risk assessments for impacted business areas"
      );
    } else {
      recommendations.push(
        "Review findings in the context of the new intelligence",
        "Consider whether severity levels need adjustment",
        "Monitor for follow-up developments"
      );
    }
  }

  return {
    impactsFound: affectedFindings.length,
    affectedFindings,
    recommendations,
  };
}

/** Enrich a CCM finding with related geopolitical context */
export async function enrichFindingWithIntelligence(
  findingId: string,
  organizationId: string
): Promise<{
  relatedEvents: {
    eventId: string;
    headline: string;
    relevance: string;
  }[];
  riskContext: string;
  geopoliticalFactors: string[];
}> {
  const finding = await db.finding.findFirst({
    where: { id: findingId, organizationId },
  });

  if (!finding) {
    return { relatedEvents: [], riskContext: "Finding not found", geopoliticalFactors: [] };
  }

  const findingText = `${finding.title} ${finding.description}`;
  const findingKeywords = extractKeywords(findingText);
  const findingCountries = extractCountryCodes(findingText);

  // Query recent events, prioritizing matching categories
  const relevantCategories = categoryToFrameworks(finding.framework);
  const events = await db.intelligenceEvent.findMany({
    where: {
      processedAt: { gte: new Date(Date.now() - 30 * 86_400_000) },
    },
    orderBy: { processedAt: "desc" },
    take: 300,
  });

  const scoredEvents: {
    event: typeof events[number];
    score: number;
    relevance: string;
  }[] = [];

  for (const event of events) {
    const eventKeywords = extractKeywords(`${event.headline} ${event.summary}`);
    const sim = jaccardSimilarity(findingKeywords, eventKeywords);
    const eventEntities = (event.entities ?? []).map((e) => e.toLowerCase());
    const entityMatch = eventEntities.some(
      (e) => e.length >= 3 && findingText.toLowerCase().includes(e)
    );
    const countryMatch =
      event.countryCode &&
      findingCountries.includes(event.countryCode.toUpperCase());

    let score = sim * 100;
    let relevance = "";

    if (entityMatch) {
      score += 30;
      relevance = "Entity name match";
    }
    if (countryMatch) {
      score += 20;
      relevance = relevance
        ? `${relevance} + country match`
        : "Country match";
    }
    if (sim > 0.05) {
      relevance = relevance
        ? `${relevance} + keyword overlap (${(sim * 100).toFixed(0)}%)`
        : `Keyword overlap (${(sim * 100).toFixed(0)}%)`;
    }

    if (score > 5) {
      scoredEvents.push({ event, score, relevance: relevance || "Low keyword similarity" });
    }
  }

  // Sort by score, take top results
  scoredEvents.sort((a, b) => b.score - a.score);
  const topEvents = scoredEvents.slice(0, 10);

  // Build risk context
  const geopoliticalFactors: string[] = [];
  const categories = new Set(topEvents.map((e) => e.event.category));
  const countries = new Set(
    topEvents
      .filter((e) => e.event.countryName)
      .map((e) => e.event.countryName!)
  );

  if (categories.has("SANCTIONS")) {
    geopoliticalFactors.push("Active sanctions activity in related entities or jurisdictions");
  }
  if (categories.has("CONFLICT")) {
    geopoliticalFactors.push("Ongoing conflict in related regions may disrupt operations");
  }
  if (categories.has("POLITICAL")) {
    geopoliticalFactors.push("Political developments may drive regulatory changes");
  }
  if (categories.has("ECONOMIC")) {
    geopoliticalFactors.push("Economic conditions may affect compliance risk exposure");
  }
  if (categories.has("CYBER")) {
    geopoliticalFactors.push("Cyber threats targeting related sectors or entities");
  }

  const riskContext =
    topEvents.length > 0
      ? `Finding "${finding.title}" has ${topEvents.length} related geopolitical event(s) across ${countries.size} country/countries (${Array.from(countries).join(", ")}). Key categories: ${Array.from(categories).join(", ")}. Highest event risk score: ${Math.max(...topEvents.map((e) => e.event.riskScore))}/100.`
      : `No significant geopolitical events correlated with this finding in the past 30 days.`;

  return {
    relatedEvents: topEvents.map((e) => ({
      eventId: e.event.id,
      headline: e.event.headline,
      relevance: e.relevance,
    })),
    riskContext,
    geopoliticalFactors,
  };
}

/** Monitor for regulatory changes that affect active rules */
export async function checkRegulatoryChanges(
  organizationId: string
): Promise<{
  changesDetected: number;
  affectedRules: {
    ruleId: string;
    ruleName: string;
    change: string;
    recommendation: string;
  }[];
}> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);

  const [rules, events] = await Promise.all([
    db.monitoringRule.findMany({
      where: { organizationId, isActive: true },
    }),
    db.intelligenceEvent.findMany({
      where: {
        processedAt: { gte: sevenDaysAgo },
        category: { in: ["POLITICAL", "SANCTIONS"] },
      },
      orderBy: { processedAt: "desc" },
      take: 200,
    }),
  ]);

  const affectedRules: {
    ruleId: string;
    ruleName: string;
    change: string;
    recommendation: string;
  }[] = [];

  // Keywords indicating regulatory changes
  const regulatoryKeywords = new Set([
    "regulation", "directive", "law", "legislation", "compliance",
    "requirement", "mandate", "enacted", "effective", "amendment",
    "revised", "updated", "new rule", "enforcement", "penalty",
    "sanctions list", "designation", "ofac", "fatf", "aml",
    "gdpr", "pci", "sox", "hipaa", "nist",
  ]);

  for (const event of events) {
    const eventText = `${event.headline} ${event.summary}`.toLowerCase();
    const eventKeywords = extractKeywords(eventText);

    // Check if this event is regulatory in nature
    let isRegulatory = false;
    for (const kw of regulatoryKeywords) {
      if (eventText.includes(kw)) {
        isRegulatory = true;
        break;
      }
    }
    if (!isRegulatory) continue;

    for (const rule of rules) {
      const ruleText =
        `${rule.name} ${rule.description}`.toLowerCase();
      const ruleKeywords = extractKeywords(ruleText);
      const sim = jaccardSimilarity(eventKeywords, ruleKeywords);

      // Framework-specific matching
      const frameworkMatch =
        (event.category === "SANCTIONS" &&
          (rule.framework === "AML_BSA" || rule.framework === "CUSTOM")) ||
        (eventText.includes("gdpr") && rule.framework === "GDPR") ||
        (eventText.includes("sox") && rule.framework === "SOX") ||
        (eventText.includes("hipaa") && rule.framework === "HIPAA") ||
        (eventText.includes("pci") && rule.framework === "PCI_DSS") ||
        (eventText.includes("nist") && rule.framework === "NIST_CSF") ||
        (eventText.includes("iso 27001") && rule.framework === "ISO_27001");

      const isMatch = (sim > 0.08 && frameworkMatch) || sim > 0.15;

      if (isMatch) {
        let recommendation: string;
        if (event.category === "SANCTIONS") {
          recommendation = `Update rule thresholds and screening lists based on "${event.headline}". Re-run rule against recent data.`;
        } else {
          recommendation = `Review rule definition for alignment with "${event.headline}". Consider updating conditions or adding new controls.`;
        }

        affectedRules.push({
          ruleId: rule.id,
          ruleName: rule.name,
          change: event.headline,
          recommendation,
        });
      }
    }
  }

  // Deduplicate by ruleId (keep highest-impact change)
  const uniqueRules = new Map<
    string,
    (typeof affectedRules)[number]
  >();
  for (const ar of affectedRules) {
    if (!uniqueRules.has(ar.ruleId)) {
      uniqueRules.set(ar.ruleId, ar);
    }
  }

  const deduped = Array.from(uniqueRules.values());

  return {
    changesDetected: deduped.length,
    affectedRules: deduped,
  };
}
