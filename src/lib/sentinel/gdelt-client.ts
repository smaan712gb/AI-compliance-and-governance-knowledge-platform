// ============================================
// SENTINEL — GDELT API Client
// Free, no API key required
// Rate limit: 1 request per 5 seconds
// Used to enrich crisis index with news velocity data
// ============================================

export interface GdeltArticle {
  url: string;
  title: string;
  seendate: string;
  socialimage: string;
  domain: string;
  language: string;
  sourcecountry: string;
}

export interface GdeltNewsVolume {
  country: string;
  countryCode: string;
  articlesLast24h: number;
  articlesLast7d: number;
  conflictArticles24h: number;
  fetchedAt: string;
}

// Map ISO-2 to GDELT country names
const COUNTRY_NAMES: Record<string, string> = {
  UA: "Ukraine", RU: "Russia", CN: "China", TW: "Taiwan",
  IR: "Iran", IL: "Israel", PS: "Palestine", SY: "Syria",
  IQ: "Iraq", AF: "Afghanistan", YE: "Yemen", SD: "Sudan",
  SS: "South Sudan", SO: "Somalia", CD: "Congo", CF: "Central African Republic",
  MM: "Myanmar", LY: "Libya", ML: "Mali", BF: "Burkina Faso",
  NE: "Niger", HT: "Haiti", NG: "Nigeria", PK: "Pakistan",
  ET: "Ethiopia", MZ: "Mozambique", LB: "Lebanon", EG: "Egypt",
  US: "United States", GB: "United Kingdom", DE: "Germany", FR: "France",
  JP: "Japan", KR: "South Korea", IN: "India", BR: "Brazil",
  MX: "Mexico", CO: "Colombia", VE: "Venezuela", TR: "Turkey",
  SA: "Saudi Arabia", ZA: "South Africa", KE: "Kenya", PH: "Philippines",
  ID: "Indonesia", TH: "Thailand", VN: "Vietnam", BD: "Bangladesh",
};

const GDELT_BASE = "https://api.gdeltproject.org/api/v2/doc/doc";

/**
 * Fetch news article count from GDELT DOC API for a country.
 * Free, no key needed. Must wait 5+ seconds between requests.
 */
export async function fetchGdeltNewsVolume(
  countryCode: string,
  timespan = "24h"
): Promise<{ count: number; articles: GdeltArticle[] } | null> {
  const countryName = COUNTRY_NAMES[countryCode.toUpperCase()];
  if (!countryName) return null;

  const query = encodeURIComponent(`${countryName} (conflict OR crisis OR attack OR military OR war OR protest)`);
  const url = `${GDELT_BASE}?query=${query}&mode=ArtList&maxrecords=25&format=json&timespan=${timespan}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    clearTimeout(timeout);

    if (res.status === 429) {
      console.warn(`[GDELT] Rate limited for ${countryCode}`);
      return null;
    }

    if (!res.ok) return null;

    const data = await res.json();
    const articles: GdeltArticle[] = data.articles || [];

    return {
      count: articles.length,
      articles,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch GDELT news volumes for multiple countries with rate limiting.
 * Designed to run during cron (not on page load).
 * Processes one country every 6 seconds to respect rate limits.
 */
export async function fetchBatchGdeltVolumes(
  countryCodes: string[]
): Promise<GdeltNewsVolume[]> {
  const results: GdeltNewsVolume[] = [];
  const DELAY_MS = 6_000; // 6 seconds between requests

  for (const cc of countryCodes) {
    const countryName = COUNTRY_NAMES[cc];
    if (!countryName) continue;

    const result = await fetchGdeltNewsVolume(cc, "24h");

    if (result) {
      results.push({
        country: countryName,
        countryCode: cc,
        articlesLast24h: result.count,
        articlesLast7d: 0, // would need separate call
        conflictArticles24h: result.count,
        fetchedAt: new Date().toISOString(),
      });
    }

    // Rate limit: wait between requests (skip if last in batch)
    if (cc !== countryCodes[countryCodes.length - 1]) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  return results;
}

/** Priority countries for GDELT monitoring (conflict zones + major powers) */
export const GDELT_PRIORITY_COUNTRIES = [
  "UA", "RU", "IL", "PS", "IR", "SY", "YE", "SD", "AF",
  "CN", "TW", "MM", "CD", "ML", "US", "GB", "FR", "DE",
  "IN", "PK", "BR", "SA", "TR", "NG", "ET", "SO", "LB",
];
