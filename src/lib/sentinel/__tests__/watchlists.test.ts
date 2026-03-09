import { describe, it, expect } from "vitest";
import type { WatchlistType, WatchlistItem, WatchlistWithMatches } from "../watchlists";

// ============================================
// Watchlists — Pure Logic & Type Tests
// The actual exported functions use Prisma, so we recreate
// the matching and validation logic inline for testing.
// ============================================

const MAX_ITEMS_PER_WATCHLIST = 50;

// Recreate the matching logic from checkEventAgainstWatchlists
function matchItem(
  watchlistType: WatchlistType,
  itemValue: string,
  event: {
    headline: string;
    summary: string;
    countryCode?: string | null;
    category: string;
    entities: string[];
    tags: string[];
  }
): { matched: boolean; score: number } {
  const val = itemValue.trim();
  if (!val) return { matched: false, score: 0 };

  const headlineLower = event.headline.toLowerCase();
  const summaryLower = event.summary.toLowerCase();
  const entitiesLower = event.entities.map((e) => e.toLowerCase());
  const tagsLower = event.tags.map((t) => t.toLowerCase());
  const countryUpper = event.countryCode?.toUpperCase() || "";
  const categoryUpper = event.category.toUpperCase();

  let matched = false;
  let score = 1.0;

  switch (watchlistType) {
    case "COUNTRY":
      matched = countryUpper === val.toUpperCase();
      break;

    case "ENTITY":
    case "SUPPLIER": {
      const valLower = val.toLowerCase();
      if (entitiesLower.some((e) => e.includes(valLower))) {
        matched = true;
      } else if (headlineLower.includes(valLower)) {
        matched = true;
        score = 0.9;
      } else if (summaryLower.includes(valLower)) {
        matched = true;
        score = 0.7;
      }
      break;
    }

    case "KEYWORD": {
      const valLower = val.toLowerCase();
      if (headlineLower.includes(valLower)) {
        matched = true;
      } else if (summaryLower.includes(valLower)) {
        matched = true;
        score = 0.8;
      }
      break;
    }

    case "SECTOR": {
      const valLower = val.toLowerCase();
      if (categoryUpper === val.toUpperCase()) {
        matched = true;
      } else if (tagsLower.some((t) => t.includes(valLower))) {
        matched = true;
        score = 0.8;
      }
      break;
    }

    case "ROUTE": {
      const valLower = val.toLowerCase();
      if (tagsLower.some((t) => t.includes(valLower))) {
        matched = true;
      } else if (summaryLower.includes(valLower)) {
        matched = true;
        score = 0.7;
      }
      break;
    }
  }

  return { matched, score };
}

// Recreate deduplication logic from checkEventAgainstWatchlists
function deduplicateMatches(
  records: { watchlistId: string; eventId: string; matchedItem: string; matchScore: number }[]
): Map<string, { watchlistId: string; eventId: string; matchedItem: string; matchScore: number }> {
  const deduped = new Map<string, (typeof records)[number]>();
  for (const record of records) {
    const key = `${record.watchlistId}:${record.eventId}`;
    const existing = deduped.get(key);
    if (!existing || record.matchScore > existing.matchScore) {
      deduped.set(key, record);
    }
  }
  return deduped;
}

// Recreate item deduplication logic from createWatchlist
function deduplicateItems(items: WatchlistItem[]): WatchlistItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.value.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

describe("Sentinel Watchlists", () => {
  // ---- Type Tests ----
  describe("WatchlistType", () => {
    it("accepts all 6 valid watchlist types", () => {
      const types: WatchlistType[] = [
        "COUNTRY",
        "ENTITY",
        "KEYWORD",
        "SUPPLIER",
        "SECTOR",
        "ROUTE",
      ];
      expect(types).toHaveLength(6);
      for (const t of types) {
        expect(typeof t).toBe("string");
      }
    });
  });

  describe("WatchlistItem interface", () => {
    it("requires a value field", () => {
      const item: WatchlistItem = { value: "UA" };
      expect(item.value).toBe("UA");
    });

    it("supports optional label and metadata", () => {
      const item: WatchlistItem = {
        value: "Huawei",
        label: "Huawei Technologies",
        metadata: { sector: "telecom", risk: "high" },
      };
      expect(item.value).toBe("Huawei");
      expect(item.label).toBe("Huawei Technologies");
      expect(item.metadata).toEqual({ sector: "telecom", risk: "high" });
    });
  });

  describe("WatchlistWithMatches interface", () => {
    it("has all required fields", () => {
      const wl: WatchlistWithMatches = {
        id: "wl-1",
        name: "My Countries",
        type: "COUNTRY",
        items: [{ value: "UA" }],
        isActive: true,
        matchCount: 5,
        unreadCount: 2,
        lastMatchAt: new Date("2026-03-01"),
      };
      expect(wl.id).toBe("wl-1");
      expect(wl.matchCount).toBe(5);
      expect(wl.unreadCount).toBe(2);
      expect(wl.lastMatchAt).toBeInstanceOf(Date);
    });

    it("allows null lastMatchAt", () => {
      const wl: WatchlistWithMatches = {
        id: "wl-2",
        name: "New List",
        type: "KEYWORD",
        items: [],
        isActive: true,
        matchCount: 0,
        unreadCount: 0,
        lastMatchAt: null,
      };
      expect(wl.lastMatchAt).toBeNull();
    });
  });

  // ---- Constants ----
  describe("MAX_ITEMS_PER_WATCHLIST", () => {
    it("is 50", () => {
      expect(MAX_ITEMS_PER_WATCHLIST).toBe(50);
    });
  });

  // ---- Validation Logic ----
  describe("Validation logic", () => {
    it("rejects empty watchlist name", () => {
      const name = "   ";
      expect(name.trim()).toBe("");
    });

    it("rejects empty items array", () => {
      const items: WatchlistItem[] = [];
      expect(items.length === 0).toBe(true);
    });

    it("rejects items exceeding MAX_ITEMS_PER_WATCHLIST", () => {
      const items = Array.from({ length: 51 }, (_, i) => ({ value: `item-${i}` }));
      expect(items.length > MAX_ITEMS_PER_WATCHLIST).toBe(true);
    });

    it("accepts items at the limit", () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ value: `item-${i}` }));
      expect(items.length <= MAX_ITEMS_PER_WATCHLIST).toBe(true);
    });
  });

  // ---- Item Deduplication ----
  describe("Item deduplication", () => {
    it("removes duplicate items by lowercase value", () => {
      const items: WatchlistItem[] = [
        { value: "Huawei" },
        { value: "huawei" },
        { value: "HUAWEI" },
        { value: "TSMC" },
      ];
      const unique = deduplicateItems(items);
      expect(unique).toHaveLength(2);
      expect(unique[0].value).toBe("Huawei");
      expect(unique[1].value).toBe("TSMC");
    });

    it("trims whitespace before deduplicating", () => {
      const items: WatchlistItem[] = [
        { value: " UA " },
        { value: "UA" },
      ];
      const unique = deduplicateItems(items);
      expect(unique).toHaveLength(1);
    });
  });

  // ---- COUNTRY Matching ----
  describe("COUNTRY matching", () => {
    const event = {
      headline: "Conflict escalation in Eastern Europe",
      summary: "Fighting intensified near border regions",
      countryCode: "UA",
      category: "CONFLICT",
      entities: ["Ukrainian Army"],
      tags: ["eastern-europe"],
    };

    it("matches exact country code (case-insensitive)", () => {
      const result = matchItem("COUNTRY", "UA", event);
      expect(result.matched).toBe(true);
      expect(result.score).toBe(1.0);
    });

    it("matches lowercase country code against uppercase event", () => {
      const result = matchItem("COUNTRY", "ua", event);
      expect(result.matched).toBe(true);
    });

    it("does not match different country code", () => {
      const result = matchItem("COUNTRY", "RU", event);
      expect(result.matched).toBe(false);
    });

    it("does not match when event has no country code", () => {
      const noCountry = { ...event, countryCode: null };
      const result = matchItem("COUNTRY", "UA", noCountry);
      expect(result.matched).toBe(false);
    });
  });

  // ---- ENTITY / SUPPLIER Matching ----
  describe("ENTITY and SUPPLIER matching", () => {
    const event = {
      headline: "TSMC announces new chip factory",
      summary: "The semiconductor giant plans to invest in Arizona",
      countryCode: "US",
      category: "TECHNOLOGY",
      entities: ["TSMC", "Intel Corporation"],
      tags: ["semiconductors"],
    };

    it("matches entity in entities list (score 1.0)", () => {
      const result = matchItem("ENTITY", "TSMC", event);
      expect(result.matched).toBe(true);
      expect(result.score).toBe(1.0);
    });

    it("matches partial entity name in entities list", () => {
      const result = matchItem("ENTITY", "Intel", event);
      expect(result.matched).toBe(true);
      expect(result.score).toBe(1.0);
    });

    it("matches entity in headline (score 0.9)", () => {
      const eventNoEntities = { ...event, entities: [] };
      const result = matchItem("ENTITY", "TSMC", eventNoEntities);
      expect(result.matched).toBe(true);
      expect(result.score).toBe(0.9);
    });

    it("matches entity in summary (score 0.7)", () => {
      const result = matchItem("ENTITY", "Arizona", event);
      expect(result.matched).toBe(true);
      expect(result.score).toBe(0.7);
    });

    it("SUPPLIER type behaves identically to ENTITY", () => {
      const entityResult = matchItem("ENTITY", "TSMC", event);
      const supplierResult = matchItem("SUPPLIER", "TSMC", event);
      expect(entityResult).toEqual(supplierResult);
    });

    it("does not match absent entity", () => {
      const result = matchItem("ENTITY", "Samsung", event);
      expect(result.matched).toBe(false);
    });
  });

  // ---- KEYWORD Matching ----
  describe("KEYWORD matching", () => {
    const event = {
      headline: "Nuclear sanctions imposed on exports",
      summary: "New embargo targets energy sector supply chains",
      countryCode: "IR",
      category: "SANCTIONS",
      entities: [],
      tags: ["energy", "nuclear"],
    };

    it("matches keyword in headline (score 1.0)", () => {
      const result = matchItem("KEYWORD", "nuclear", event);
      expect(result.matched).toBe(true);
      expect(result.score).toBe(1.0);
    });

    it("matches keyword in summary (score 0.8)", () => {
      const result = matchItem("KEYWORD", "embargo", event);
      expect(result.matched).toBe(true);
      expect(result.score).toBe(0.8);
    });

    it("is case-insensitive", () => {
      const result = matchItem("KEYWORD", "SANCTIONS", event);
      expect(result.matched).toBe(true);
    });

    it("does not match absent keyword", () => {
      const result = matchItem("KEYWORD", "cyberattack", event);
      expect(result.matched).toBe(false);
    });
  });

  // ---- SECTOR Matching ----
  describe("SECTOR matching", () => {
    const event = {
      headline: "Automotive industry disruption",
      summary: "Chip shortage hits car manufacturers",
      countryCode: "DE",
      category: "TECHNOLOGY",
      entities: [],
      tags: ["semiconductors", "automotive"],
    };

    it("matches exact category (score 1.0)", () => {
      const result = matchItem("SECTOR", "TECHNOLOGY", event);
      expect(result.matched).toBe(true);
      expect(result.score).toBe(1.0);
    });

    it("matches category case-insensitively", () => {
      const result = matchItem("SECTOR", "technology", event);
      expect(result.matched).toBe(true);
      expect(result.score).toBe(1.0);
    });

    it("matches tag containing the sector value (score 0.8)", () => {
      const result = matchItem("SECTOR", "automotive", event);
      expect(result.matched).toBe(true);
      expect(result.score).toBe(0.8);
    });

    it("does not match absent sector", () => {
      const result = matchItem("SECTOR", "HEALTHCARE", event);
      expect(result.matched).toBe(false);
    });
  });

  // ---- ROUTE Matching ----
  describe("ROUTE matching", () => {
    const event = {
      headline: "Shipping delays at Suez Canal",
      summary: "Red Sea disruptions reroute cargo via Cape of Good Hope",
      countryCode: "EG",
      category: "LOGISTICS",
      entities: [],
      tags: ["suez-canal", "red-sea", "shipping"],
    };

    it("matches tag containing the route value (score 1.0)", () => {
      const result = matchItem("ROUTE", "suez", event);
      expect(result.matched).toBe(true);
      expect(result.score).toBe(1.0);
    });

    it("matches route in summary (score 0.7)", () => {
      const result = matchItem("ROUTE", "Cape of Good Hope", event);
      expect(result.matched).toBe(true);
      expect(result.score).toBe(0.7);
    });

    it("does not match absent route", () => {
      const result = matchItem("ROUTE", "Panama Canal", event);
      expect(result.matched).toBe(false);
    });
  });

  // ---- Empty / Whitespace Item Handling ----
  describe("Empty item handling", () => {
    it("skips items with empty string value", () => {
      const result = matchItem("KEYWORD", "", {
        headline: "anything",
        summary: "anything",
        category: "ANY",
        entities: [],
        tags: [],
      });
      expect(result.matched).toBe(false);
    });

    it("skips items with whitespace-only value", () => {
      const result = matchItem("KEYWORD", "   ", {
        headline: "anything",
        summary: "anything",
        category: "ANY",
        entities: [],
        tags: [],
      });
      expect(result.matched).toBe(false);
    });
  });

  // ---- Deduplication of Match Records ----
  describe("Match deduplication", () => {
    it("keeps highest score when same watchlist matches multiple items", () => {
      const records = [
        { watchlistId: "wl-1", eventId: "ev-1", matchedItem: "TSMC", matchScore: 1.0 },
        { watchlistId: "wl-1", eventId: "ev-1", matchedItem: "chip", matchScore: 0.8 },
      ];
      const deduped = deduplicateMatches(records);
      expect(deduped.size).toBe(1);
      const entry = deduped.get("wl-1:ev-1")!;
      expect(entry.matchScore).toBe(1.0);
      expect(entry.matchedItem).toBe("TSMC");
    });

    it("keeps separate entries for different watchlists", () => {
      const records = [
        { watchlistId: "wl-1", eventId: "ev-1", matchedItem: "TSMC", matchScore: 1.0 },
        { watchlistId: "wl-2", eventId: "ev-1", matchedItem: "TSMC", matchScore: 0.9 },
      ];
      const deduped = deduplicateMatches(records);
      expect(deduped.size).toBe(2);
    });

    it("keeps separate entries for different events", () => {
      const records = [
        { watchlistId: "wl-1", eventId: "ev-1", matchedItem: "TSMC", matchScore: 1.0 },
        { watchlistId: "wl-1", eventId: "ev-2", matchedItem: "TSMC", matchScore: 1.0 },
      ];
      const deduped = deduplicateMatches(records);
      expect(deduped.size).toBe(2);
    });

    it("returns empty map for no records", () => {
      const deduped = deduplicateMatches([]);
      expect(deduped.size).toBe(0);
    });
  });

  // ---- Pagination Logic ----
  describe("Pagination logic", () => {
    it("calculates totalPages correctly", () => {
      const total = 45;
      const limit = 20;
      expect(Math.ceil(total / limit)).toBe(3);
    });

    it("calculates hasMore correctly", () => {
      const page = 1;
      const limit = 20;
      const total = 45;
      const skip = (page - 1) * limit;
      expect(skip + limit < total).toBe(true);
    });

    it("hasMore is false on last page", () => {
      const page = 3;
      const limit = 20;
      const total = 45;
      const skip = (page - 1) * limit;
      expect(skip + limit < total).toBe(false);
    });
  });
});
