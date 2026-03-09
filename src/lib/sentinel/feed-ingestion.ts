// ============================================
// SENTINEL — RSS Feed Ingestion Pipeline
// Fetches, parses, classifies, and stores intelligence events
// ============================================

import { XMLParser } from "fast-xml-parser";
import { db } from "@/lib/db";
import { getIntelligenceSources, type RSSSource } from "./rss-sources";
import type { EventCategory } from "./types";
import type { EventSeverity } from "@prisma/client";
import { shouldTriggerTriage, runTriageAgent } from "./triage-agent";
import {
  trackKeywords,
  trackGeoEvent,
  type KeywordSpike,
  type GeographicConvergence,
} from "./pattern-detection";
import { checkEventAgainstWatchlists } from "./watchlists";
import { autoExtractAndLink } from "./event-graph";
import { analyzeEvent } from "./reasoning";
import {
  broadcastAlert,
  buildKeywordSpikeAlert,
  buildCrisisEscalationAlert,
} from "./webhook-alerts";

export interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  sourceId: string;
  category?: string;
}

export interface IngestionResult {
  sourcesProcessed: number;
  sourcesFailed: number;
  itemsFetched: number;
  itemsNew: number;
  itemsDuplicate: number;
  itemsSkipped: number;
  errors: { sourceId: string; error: string }[];
  durationMs: number;
  // Automation results
  automation: {
    keywordSpikes: KeywordSpike[];
    geoConvergences: GeographicConvergence[];
    watchlistMatches: number;
    graphEntitiesLinked: number;
    reasoningTriggered: number;
    triageTriggered: number;
  };
}

// Circuit breaker state per feed
const circuitBreakers = new Map<string, { failures: number; cooldownUntil: number }>();
const CIRCUIT_BREAKER_THRESHOLD = 2;
const CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});

// ---- Keyword-based Classification ----

const CATEGORY_KEYWORDS: Record<EventCategory, string[]> = {
  CONFLICT: [
    // Direct combat
    "war", "military", "troops", "airstrike", "bombing", "combat",
    "invasion", "offensive", "ceasefire", "weapons", "artillery",
    "drone strike", "missile", "casualties", "frontline", "battlefield",
    "evacuation", "armed forces", "naval", "airspace", "blockade",
    "escalation", "retaliation", "strike", "shelling", "tank",
    // Geopolitical tension
    "tension", "provocation", "threat", "confrontation", "standoff",
    "incursion", "border clash", "territorial", "disputed",
    "arms deal", "defense pact", "military aid", "troop deployment",
    "no-fly zone", "carrier group", "nuclear threat", "deterrence",
  ],
  TERRORISM: [
    "terrorist", "terrorism", "extremist", "jihad", "insurgent",
    "car bomb", "suicide bomb", "hostage", "isis", "al-qaeda",
    "militant", "radicalization", "lone wolf", "ied",
    "hezbollah", "hamas", "boko haram", "al-shabaab",
  ],
  CYBER: [
    "cyber attack", "hack", "data breach", "ransomware", "malware",
    "phishing", "vulnerability", "zero-day", "apt", "cyber espionage",
    "ddos", "critical infrastructure hack", "scada",
    "state-sponsored", "cyber warfare", "backdoor", "spyware",
    // High-impact AI safety/governance signals
    "agi", "artificial general intelligence", "superintelligence",
    "ai safety", "ai regulation", "ai governance", "ai ban",
    "deepfake", "autonomous weapons", "ai arms race",
  ],
  ECONOMIC: [
    // Trade & sanctions
    "sanctions", "tariff", "trade war", "embargo", "economic crisis",
    "trade deal", "debt crisis", "export ban", "import ban",
    // Monetary policy & central banks
    "rate cut", "rate hike", "interest rate", "federal reserve", "the fed",
    "central bank", "monetary policy", "quantitative easing", "tightening",
    "ecb", "bank of england", "bank of japan", "pboc",
    // Markets & commodities
    "oil", "gas price", "energy price", "fuel price", "commodity",
    "opec", "production cut", "supply chain", "energy crisis",
    "currency", "inflation", "recession", "stagflation", "deflation",
    "market crash", "stock crash", "bear market", "financial crisis",
    "default", "bailout", "austerity", "gdp", "unemployment",
    "food price", "grain", "wheat", "rare earth", "lithium",
    // High-impact AI/tech economic signals
    "chip shortage", "semiconductor", "data center", "power grid",
    "gpu shortage", "compute crisis", "chip war",
    "nvidia", "tsmc", "ai investment", "billion", "trillion",
  ],
  POLITICAL: [
    "election", "coup", "protest", "revolution", "political crisis",
    "referendum", "impeachment", "diplomatic", "summit", "treaty",
    "political unrest", "government collapse", "regime change",
    "assassination", "exile", "authoritarian", "democracy",
    "opposition", "parliament", "legislation", "executive order",
    "alliance", "nato", "g7", "g20", "un security council",
    "veto", "resolution", "bilateral", "multilateral",
    // Regulatory & compliance signals
    "regulation", "regulatory", "compliance", "directive", "framework",
    "enacted", "proposed rule", "final rule", "rulemaking",
    "ai act", "eu ai act", "digital services act", "digital markets act",
    "gdpr", "data protection", "privacy regulation",
    "sec rule", "sec enforcement", "cftc", "finra",
    "basel", "dodd-frank", "solvency", "mifid",
    "executive order on ai", "ai executive order",
    "antitrust", "competition authority", "merger review",
    "government oversight", "congressional hearing", "senate hearing",
    "royal assent", "gazetted", "promulgated",
  ],
  DISASTER: [
    "earthquake", "tsunami", "hurricane", "cyclone", "flood",
    "wildfire", "volcanic", "drought", "famine", "pandemic",
    "epidemic", "landslide", "tornado", "typhoon",
    "humanitarian crisis", "displacement", "refugee",
    "food insecurity", "water crisis", "climate disaster",
  ],
  SANCTIONS: [
    // Sanctions & export controls
    "sanctions", "ofac", "sdn list", "blacklist", "asset freeze",
    "travel ban", "export control", "sanctions evasion",
    "designated", "specially designated",
    "restricted entity", "blocked property", "sanctions regime",
    "sanctions violation", "sanctions package", "sanctions list",
    "magnitsky", "itar", "ear", "bis entity list",
    // Money laundering & terrorist financing
    "money laundering", "anti-money laundering", "aml",
    "terrorist financing", "counter-terrorism financing", "cft",
    "suspicious activity", "suspicious transaction", "sar",
    "beneficial ownership", "shell company", "front company",
    "correspondent banking", "de-risking", "wire fraud",
    // Fraud & financial crime
    "financial fraud", "securities fraud", "insider trading",
    "market manipulation", "ponzi scheme", "embezzlement",
    "bribery", "corruption", "fcpa", "uk bribery act",
    "kleptocracy", "illicit finance", "proceeds of crime",
    "tax evasion", "tax fraud", "offshore accounts",
    "hawala", "trade-based laundering", "smurfing",
    // Enforcement actions
    "enforcement action", "cease and desist", "consent order",
    "deferred prosecution", "guilty plea", "indictment",
    "regulatory fine", "compliance failure", "compliance violation",
    "fincen", "fatf", "grey list", "black list",
    "wolfsberg", "egmont", "financial action task force",
    // Proliferation finance
    "proliferation financing", "dual-use", "weapons proliferation",
    "nuclear program", "missile program",
  ],
  OTHER: [],
};

const SEVERITY_KEYWORDS = {
  critical: [
    // Explicit urgency
    "breaking", "urgent", "emergency", "imminent", "catastrophic",
    "mass casualty", "nuclear", "wmd", "invasion", "declaration of war",
    // Strategic chokepoints & total disruptions
    "strait of hormuz", "suez canal blocked", "strait of malacca",
    "total halt", "near total halt", "complete halt", "complete shutdown",
    "supreme leader", "regime collapse", "currency collapse", "sovereign default",
    "market crash", "flash crash", "systemic collapse",
    "assassination", "coup attempt", "martial law",
    "pandemic declared", "nuclear test", "nuclear launch",
  ],
  high: [
    "escalation", "significant", "major", "serious", "critical infrastructure",
    "large-scale", "unprecedented", "state of emergency",
    // Impact/disruption language
    "halt", "shutdown", "blockade", "closure", "collapse",
    "disruption", "suspended", "freeze", "grind to",
    "oil spike", "oil surge", "price spike", "price surge",
    "production cut", "supply disruption", "supply shock",
    "shipping disruption", "port closure", "airspace closure",
    "internet blackout", "communications disruption",
    "bank run", "capital flight", "debt crisis",
    "regime change", "new supreme leader", "new leader",
    "troop deployment", "mobilization", "military buildup",
    "rate cut", "rate hike", "interest rate decision",
    "sanctions imposed", "sanctions expanded", "asset freeze",
    "export ban", "import ban", "trade embargo",
  ],
  medium: [
    "tension", "concern", "warning", "incident", "suspected",
    "investigation", "heightened", "alert",
    "downturn", "slowdown", "contraction", "volatility",
    "diplomatic crisis", "recalled ambassador", "expelled diplomat",
    "protest", "demonstration", "unrest", "strike action",
  ],
};

// ---- Noise Filter: Routine Government Publications ----
// Skip titles that are clearly routine data releases, not intelligence
const ROUTINE_NOISE_PATTERNS = [
  /^bank of japan accounts/i,
  /^japanese government bonds held/i,
  /^monetary base and the bank of japan/i,
  /^market operations by the bank of japan/i,
  /^average contract interest rates/i,
  /^bank of japan.s transactions/i,
  /^flow of funds/i,
  /^balance of payments/i,
  /^money stock/i,
  /^consumer price index \(/i,
  /^producer price index \(/i,
  /^minutes of the monetary policy/i,
  /^summary of opinions/i,
  /^principal figures of financial/i,
  // Generic routine patterns
  /^monthly report/i,
  /^quarterly report/i,
  /^weekly statistical/i,
  /^daily treasury/i,
];

function isRoutinePublication(title: string): boolean {
  return ROUTINE_NOISE_PATTERNS.some((pattern) => pattern.test(title));
}

export function classifyEvent(title: string, description: string): {
  category: EventCategory;
  severity: "critical" | "high" | "medium" | "low" | "info";
  riskScore: number;
} {
  const text = `${title} ${description}`.toLowerCase();

  // Find best category match
  let bestCategory: EventCategory = "OTHER";
  let bestScore = 0;

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matches = keywords.filter((kw) => text.includes(kw)).length;
    if (matches > bestScore) {
      bestScore = matches;
      bestCategory = cat as EventCategory;
    }
  }

  // Determine severity
  let severity: "critical" | "high" | "medium" | "low" | "info" = "low";
  if (SEVERITY_KEYWORDS.critical.some((kw) => text.includes(kw))) {
    severity = "critical";
  } else if (SEVERITY_KEYWORDS.high.some((kw) => text.includes(kw))) {
    severity = "high";
  } else if (SEVERITY_KEYWORDS.medium.some((kw) => text.includes(kw))) {
    severity = "medium";
  } else if (bestScore === 0) {
    severity = "info";
  }

  // If no intelligence category matched, cap severity — generic "emergency"/"urgent"
  // keywords in non-intelligence articles should not produce false CRITICAL events
  if (bestCategory === "OTHER" && (severity === "critical" || severity === "high")) {
    severity = "medium";
  }

  // Risk score based on category + severity
  const severityScores = { critical: 90, high: 70, medium: 50, low: 30, info: 10 };
  const riskScore = Math.min(100, severityScores[severity] + bestScore * 5);

  return { category: bestCategory, severity, riskScore };
}

// ---- Country Extraction ----

const COUNTRY_PATTERNS: Record<string, string> = {
  ukraine: "UA", russia: "RU", china: "CN", taiwan: "TW",
  iran: "IR", israel: "IL", palestine: "PS", gaza: "PS",
  syria: "SY", iraq: "IQ", afghanistan: "AF", yemen: "YE",
  "north korea": "KP", "south korea": "KR", japan: "JP",
  india: "IN", pakistan: "PK", myanmar: "MM", "united states": "US",
  "united kingdom": "GB", germany: "DE", france: "FR",
  turkey: "TR", egypt: "EG", "saudi arabia": "SA",
  sudan: "SD", "south sudan": "SS", somalia: "SO",
  libya: "LY", mali: "ML", niger: "NE", nigeria: "NG",
  "burkina faso": "BF", ethiopia: "ET", kenya: "KE",
  "democratic republic of congo": "CD", "central african republic": "CF",
  venezuela: "VE", cuba: "CU", haiti: "HT", mexico: "MX",
  colombia: "CO", brazil: "BR", lebanon: "LB",
  "hong kong": "HK", philippines: "PH", indonesia: "ID",
  thailand: "TH", vietnam: "VN", bangladesh: "BD",
  "south africa": "ZA", zimbabwe: "ZW",
};

export function extractCountryCode(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [name, code] of Object.entries(COUNTRY_PATTERNS)) {
    if (lower.includes(name)) return code;
  }
  return null;
}

// ---- Entity Extraction (lightweight) ----

export function extractEntities(text: string): string[] {
  // Extract capitalized multi-word phrases as potential entities
  const matches = text.match(/(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g) || [];
  // Deduplicate and limit
  return [...new Set(matches)].slice(0, 10);
}

// ---- Feed Fetching ----

export async function fetchFeed(source: RSSSource): Promise<FeedItem[]> {
  // Check circuit breaker
  const cb = circuitBreakers.get(source.id);
  if (cb && Date.now() < cb.cooldownUntil) {
    return [];
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Sentinel/1.0 (Intelligence Feed Aggregator)",
        Accept: "application/rss+xml, application/xml, text/xml, application/atom+xml",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xml = await response.text();
    const parsed = xmlParser.parse(xml);

    // Reset circuit breaker on success
    circuitBreakers.delete(source.id);

    return extractItems(parsed, source);
  } catch (error) {
    // Update circuit breaker
    const existing = circuitBreakers.get(source.id) || { failures: 0, cooldownUntil: 0 };
    existing.failures++;
    if (existing.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      existing.cooldownUntil = Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS;
    }
    circuitBreakers.set(source.id, existing);

    throw error;
  }
}

function extractItems(parsed: Record<string, unknown>, source: RSSSource): FeedItem[] {
  const items: FeedItem[] = [];

  // RSS 2.0 format
  const rssChannel = (parsed as { rss?: { channel?: { item?: unknown[] | unknown } } })
    .rss?.channel;
  if (rssChannel) {
    const rawItems = Array.isArray(rssChannel.item)
      ? rssChannel.item
      : rssChannel.item
      ? [rssChannel.item]
      : [];

    for (const item of rawItems as Record<string, unknown>[]) {
      items.push({
        title: String(item.title || ""),
        link: String(item.link || ""),
        description: stripHtml(String(item.description || "")),
        pubDate: String(item.pubDate || ""),
        source: source.name,
        sourceId: source.id,
      });
    }
  }

  // Atom format
  const atomFeed = (parsed as { feed?: { entry?: unknown[] | unknown } }).feed;
  if (atomFeed && !rssChannel) {
    const entries = Array.isArray(atomFeed.entry)
      ? atomFeed.entry
      : atomFeed.entry
      ? [atomFeed.entry]
      : [];

    for (const entry of entries as Record<string, unknown>[]) {
      const link = typeof entry.link === "object" && entry.link !== null
        ? (entry.link as { "@_href"?: string })["@_href"] || ""
        : String(entry.link || "");

      items.push({
        title: String(entry.title || ""),
        link,
        description: stripHtml(String(entry.summary || entry.content || "")),
        pubDate: String(entry.updated || entry.published || ""),
        source: source.name,
        sourceId: source.id,
      });
    }
  }

  return items;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

// ---- Ingestion Pipeline ----

export async function runIngestionPipeline(
  maxSources?: number
): Promise<IngestionResult> {
  const startTime = Date.now();
  const result: IngestionResult = {
    sourcesProcessed: 0,
    sourcesFailed: 0,
    itemsFetched: 0,
    itemsNew: 0,
    itemsDuplicate: 0,
    itemsSkipped: 0,
    errors: [],
    durationMs: 0,
    automation: {
      keywordSpikes: [],
      geoConvergences: [],
      watchlistMatches: 0,
      graphEntitiesLinked: 0,
      reasoningTriggered: 0,
      triageTriggered: 0,
    },
  };

  const allIntelSources = getIntelligenceSources();
  const sources = maxSources
    ? allIntelSources.slice(0, maxSources)
    : allIntelSources;

  // Process in batches of 10 to avoid overwhelming external servers
  const BATCH_SIZE = 10;
  for (let i = 0; i < sources.length; i += BATCH_SIZE) {
    const batch = sources.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (source) => {
        const items = await fetchFeed(source);
        return { source, items };
      })
    );

    for (const batchResult of batchResults) {
      if (batchResult.status === "rejected") {
        result.sourcesFailed++;
        result.errors.push({
          sourceId: batch[batchResults.indexOf(batchResult)]?.id || "unknown",
          error: String(batchResult.reason),
        });
        continue;
      }

      const { source, items } = batchResult.value;
      result.sourcesProcessed++;
      result.itemsFetched += items.length;

      // Process items
      for (const item of items) {
        if (!item.title || !item.link) continue;

        // Skip routine government publications (BoJ accounts, etc.)
        if (isRoutinePublication(item.title)) {
          result.itemsSkipped++;
          continue;
        }

        // Check for duplicates by URL
        const existing = await db.intelligenceEvent.findFirst({
          where: { sourceUrl: item.link },
          select: { id: true },
        });

        if (existing) {
          result.itemsDuplicate++;
          continue;
        }

        const { category, severity, riskScore } = classifyEvent(
          item.title,
          item.description
        );

        // Skip low-relevance items — no intelligence keywords matched
        if (category === "OTHER" && severity === "info") {
          result.itemsSkipped++;
          continue;
        }
        // Skip anything with minimal risk score (noise from non-intel sources)
        if (riskScore <= 10) {
          result.itemsSkipped++;
          continue;
        }

        const countryCode = extractCountryCode(`${item.title} ${item.description}`);
        const entities = extractEntities(item.title);

        const severityMap = {
          critical: "SENTINEL_CRITICAL" as const,
          high: "SENTINEL_HIGH" as const,
          medium: "SENTINEL_MEDIUM" as const,
          low: "SENTINEL_LOW" as const,
          info: "INFO" as const,
        };

        const newEvent = await db.intelligenceEvent.create({
          data: {
            headline: item.title.slice(0, 500),
            summary: item.description.slice(0, 2000) || item.title,
            source: source.name,
            sourceUrl: item.link,
            category,
            severity: severityMap[severity],
            countryCode,
            riskScore,
            entities,
            tags: [source.category, source.region],
            publishedAt: parsePubDate(item.pubDate),
            processedAt: new Date(),
          },
        });

        result.itemsNew++;

        // ============================================================
        // AUTOMATION HOOKS — Run on every new event
        // ============================================================

        const fullText = `${item.title} ${item.description}`;
        const dbSeverity = severityMap[severity];

        // 1. Pattern Detection — keyword spikes + geographic convergence
        try {
          const spikes = trackKeywords(fullText, source.name);
          if (spikes.length > 0) {
            result.automation.keywordSpikes.push(...spikes);
          }
          if (countryCode) {
            const convergence = trackGeoEvent(countryCode, category);
            if (convergence) {
              result.automation.geoConvergences.push(convergence);
            }
          }
        } catch (err) {
          console.error(`[Ingestion] Pattern detection failed:`, err);
        }

        // 2. Watchlist Matching — ALL events, not just critical
        try {
          const watchResult = await checkEventAgainstWatchlists({
            id: newEvent.id,
            headline: item.title,
            summary: item.description,
            countryCode,
            category,
            entities,
            tags: [source.category, source.region],
          });
          result.automation.watchlistMatches += watchResult.matchesCreated;
        } catch (err) {
          console.error(`[Ingestion] Watchlist matching failed:`, err);
        }

        // 3. Knowledge Graph — auto-extract entities and link
        try {
          const links = await autoExtractAndLink(
            newEvent.id,
            item.title,
            item.description,
            countryCode || undefined,
          );
          result.automation.graphEntitiesLinked += links.length;
        } catch (err) {
          console.error(`[Ingestion] Graph extraction failed:`, err);
        }

        // 4. Auto AI Reasoning — for CRITICAL, HIGH, and strategic MEDIUM events
        const shouldReason =
          dbSeverity === "SENTINEL_CRITICAL" ||
          dbSeverity === "SENTINEL_HIGH" ||
          (dbSeverity === "SENTINEL_MEDIUM" && riskScore >= 55);

        if (shouldReason) {
          result.automation.reasoningTriggered++;
          analyzeEvent({
            headline: item.title,
            content: item.description,
            source: source.name,
            countryCode: countryCode || undefined,
          }).then(async (reasoning) => {
            try {
              // Store reasoning result linked to event
              await db.reasoningHistory.create({
                data: {
                  userId: "system-auto-reasoning",
                  eventId: newEvent.id,
                  headline: item.title.slice(0, 500),
                  countryCode: countryCode || null,
                  category: reasoning.category as EventCategory,
                  inputContext: item.description.slice(0, 2000),
                  reasoningChain: JSON.stringify(reasoning.reasoning),
                  classification: {
                    category: reasoning.category,
                    severity: reasoning.severity,
                    riskScore: reasoning.riskScore,
                  },
                  predictedOutcome: reasoning.reasoning.whatHappensNext || null,
                  tokens: reasoning.reasoningTokens,
                },
              });

              // --- WRITE BACK: Update the event with AI-assessed severity ---
              // Only upgrade severity (never downgrade — AI may over-correct for low events)
              const aiSeverityMap: Record<string, string> = {
                critical: "SENTINEL_CRITICAL",
                high: "SENTINEL_HIGH",
                medium: "SENTINEL_MEDIUM",
                low: "SENTINEL_LOW",
                info: "INFO",
              };
              const severityRank: Record<string, number> = {
                INFO: 0, SENTINEL_LOW: 1, SENTINEL_MEDIUM: 2,
                SENTINEL_HIGH: 3, SENTINEL_CRITICAL: 4,
              };

              const aiDbSeverity = aiSeverityMap[reasoning.severity] || dbSeverity;
              const currentRank = severityRank[dbSeverity] ?? 0;
              const aiRank = severityRank[aiDbSeverity] ?? 0;

              // Upgrade if AI says it's more severe, OR if AI risk score is significantly higher
              if (aiRank > currentRank || reasoning.riskScore > riskScore + 15) {
                await db.intelligenceEvent.update({
                  where: { id: newEvent.id },
                  data: {
                    severity: aiRank > currentRank ? aiDbSeverity as EventSeverity : undefined,
                    riskScore: Math.max(riskScore, reasoning.riskScore),
                    // Also update category if AI disagrees (more specific)
                    ...(reasoning.category !== category && reasoning.category !== "OTHER"
                      ? { category: reasoning.category as EventCategory }
                      : {}),
                  },
                });
                console.log(
                  `[Ingestion] AI upgraded ${newEvent.id}: ${dbSeverity}/${riskScore} → ${aiDbSeverity}/${reasoning.riskScore}`,
                );
              }
            } catch {
              // Reasoning/update failure is non-fatal
            }
          }).catch((err) => {
            console.error(`[Ingestion] Auto-reasoning failed for ${newEvent.id}:`, err);
          });
        }

        // 5. Triage Agent — fire-and-forget for high-severity events
        // Also considers AI-upgraded events (riskScore may increase after reasoning)
        if (shouldTriggerTriage({ severity: dbSeverity, riskScore })) {
          result.automation.triageTriggered++;
          // Find an active org to assign cases/briefings to
          db.sentinelOrgMember.findFirst({
            where: { role: "ADMIN", isActive: true },
            select: { organizationId: true },
          }).then((admin) => {
            return runTriageAgent(newEvent.id, admin?.organizationId || undefined);
          }).catch((err) => {
            console.error(`[Ingestion] Triage agent failed for ${newEvent.id}:`, err);
          });
        }
      }
    }
  }

  result.durationMs = Date.now() - startTime;
  return result;
}

function parsePubDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Reset circuit breakers (for testing)
export function resetCircuitBreakers(): void {
  circuitBreakers.clear();
}
