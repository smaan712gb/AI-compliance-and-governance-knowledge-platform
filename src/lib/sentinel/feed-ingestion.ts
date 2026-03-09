// ============================================
// SENTINEL — RSS Feed Ingestion Pipeline
// Fetches, parses, classifies, and stores intelligence events
// ============================================

import { XMLParser } from "fast-xml-parser";
import { db } from "@/lib/db";
import { getIntelligenceSources, type RSSSource } from "./rss-sources";
import type { EventCategory } from "./types";
import { shouldTriggerTriage, runTriageAgent } from "./triage-agent";

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
  errors: { sourceId: string; error: string }[];
  durationMs: number;
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
  ],
  DISASTER: [
    "earthquake", "tsunami", "hurricane", "cyclone", "flood",
    "wildfire", "volcanic", "drought", "famine", "pandemic",
    "epidemic", "landslide", "tornado", "typhoon",
    "humanitarian crisis", "displacement", "refugee",
    "food insecurity", "water crisis", "climate disaster",
  ],
  SANCTIONS: [
    "sanctions", "ofac", "sdn list", "blacklist", "asset freeze",
    "travel ban", "export control", "sanctions evasion",
    "designated", "specially designated",
    "restricted entity", "blocked property", "sanctions regime",
  ],
  OTHER: [],
};

const SEVERITY_KEYWORDS = {
  critical: [
    "breaking", "urgent", "emergency", "imminent", "catastrophic",
    "mass casualty", "nuclear", "wmd", "invasion", "declaration of war",
  ],
  high: [
    "escalation", "significant", "major", "serious", "critical infrastructure",
    "large-scale", "unprecedented", "state of emergency",
  ],
  medium: [
    "tension", "concern", "warning", "incident", "suspected",
    "investigation", "heightened", "alert",
  ],
};

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
    errors: [],
    durationMs: 0,
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
          continue;
        }
        // Skip anything with minimal risk score (noise from non-intel sources)
        if (riskScore <= 10) {
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

        // Fire-and-forget: trigger triage agent for high-severity events
        if (shouldTriggerTriage({ severity: severityMap[severity], riskScore })) {
          runTriageAgent(newEvent.id).catch((err) => {
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
