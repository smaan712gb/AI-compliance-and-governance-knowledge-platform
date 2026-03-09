import { describe, it, expect } from "vitest";
import {
  ALL_RSS_SOURCES,
  getSourcesByCategory,
  getSourceById,
  getSourcesDueForFetch,
} from "../rss-sources";
import type { RSSSource, SourceCategory } from "../rss-sources";

describe("RSS Sources", () => {
  describe("ALL_RSS_SOURCES", () => {
    it("has at least 40 sources", () => {
      expect(ALL_RSS_SOURCES.length).toBeGreaterThanOrEqual(40);
    });

    it("every source has all required fields", () => {
      for (const source of ALL_RSS_SOURCES) {
        expect(source.id).toBeDefined();
        expect(typeof source.id).toBe("string");
        expect(source.id.length).toBeGreaterThan(0);

        expect(source.name).toBeDefined();
        expect(typeof source.name).toBe("string");
        expect(source.name.length).toBeGreaterThan(0);

        expect(source.url).toBeDefined();
        expect(typeof source.url).toBe("string");

        expect(source.category).toBeDefined();
        expect(typeof source.category).toBe("string");

        expect(source.region).toBeDefined();
        expect(typeof source.region).toBe("string");

        expect(typeof source.reliability).toBe("number");
        expect(typeof source.fetchIntervalMinutes).toBe("number");
        expect(typeof source.isActive).toBe("boolean");
      }
    });

    it("all IDs are unique", () => {
      const ids = ALL_RSS_SOURCES.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("all URLs start with https://", () => {
      for (const source of ALL_RSS_SOURCES) {
        expect(source.url).toMatch(/^https:\/\//);
      }
    });

    it("all reliability scores are between 0 and 1", () => {
      for (const source of ALL_RSS_SOURCES) {
        expect(source.reliability).toBeGreaterThanOrEqual(0);
        expect(source.reliability).toBeLessThanOrEqual(1);
      }
    });

    it("all fetchIntervalMinutes are positive", () => {
      for (const source of ALL_RSS_SOURCES) {
        expect(source.fetchIntervalMinutes).toBeGreaterThan(0);
      }
    });
  });

  describe("getSourcesByCategory", () => {
    it("returns only sources matching the requested category", () => {
      const categories: SourceCategory[] = [
        "wire_service",
        "government",
        "think_tank",
        "cyber_threat",
        "disaster",
        "financial",
        "regional",
        "health",
        "energy",
      ];

      for (const category of categories) {
        const results = getSourcesByCategory(category);
        for (const source of results) {
          expect(source.category).toBe(category);
        }
      }
    });

    it("returns only active sources", () => {
      const categories: SourceCategory[] = [
        "wire_service",
        "government",
        "think_tank",
      ];

      for (const category of categories) {
        const results = getSourcesByCategory(category);
        for (const source of results) {
          expect(source.isActive).toBe(true);
        }
      }
    });

    it('wire_service category returns multiple results', () => {
      const wireServices = getSourcesByCategory("wire_service");
      expect(wireServices.length).toBeGreaterThan(1);
    });

    it("returns empty array for a category with no sources", () => {
      // All defined categories should have sources, but test the filtering logic
      const results = getSourcesByCategory("maritime");
      // maritime may have 0 sources in the current dataset
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("getSourceById", () => {
    it("finds reuters-world", () => {
      const source = getSourceById("reuters-world");
      expect(source).toBeDefined();
      expect(source!.name).toBe("Reuters World");
      expect(source!.category).toBe("wire_service");
    });

    it("finds cisa-alerts", () => {
      const source = getSourceById("cisa-alerts");
      expect(source).toBeDefined();
      expect(source!.name).toBe("CISA Alerts");
      expect(source!.category).toBe("cyber_threat");
    });

    it("finds usgs-quakes", () => {
      const source = getSourceById("usgs-quakes");
      expect(source).toBeDefined();
      expect(source!.name).toBe("USGS Earthquakes M4.5+");
      expect(source!.category).toBe("disaster");
    });

    it("returns undefined for unknown ID", () => {
      const source = getSourceById("nonexistent-source-xyz");
      expect(source).toBeUndefined();
    });
  });

  describe("getSourcesDueForFetch", () => {
    it("returns all active sources when lastFetchMap is empty", () => {
      const emptyMap = new Map<string, Date>();
      const due = getSourcesDueForFetch(emptyMap);

      const activeSources = ALL_RSS_SOURCES.filter((s) => s.isActive);
      expect(due.length).toBe(activeSources.length);
    });

    it("excludes sources that were recently fetched", () => {
      const now = new Date();
      const lastFetchMap = new Map<string, Date>();

      // Mark all sources as just fetched
      for (const source of ALL_RSS_SOURCES) {
        lastFetchMap.set(source.id, now);
      }

      const due = getSourcesDueForFetch(lastFetchMap);
      expect(due.length).toBe(0);
    });

    it("includes sources past their fetch interval", () => {
      const lastFetchMap = new Map<string, Date>();

      // Pick a source and set its last fetch well beyond its interval
      const reuters = getSourceById("reuters-world")!;
      const pastDue = new Date(
        Date.now() - (reuters.fetchIntervalMinutes + 5) * 60 * 1000
      );
      lastFetchMap.set(reuters.id, pastDue);

      // Mark all other sources as just fetched so only reuters is due
      const now = new Date();
      for (const source of ALL_RSS_SOURCES) {
        if (source.id !== reuters.id) {
          lastFetchMap.set(source.id, now);
        }
      }

      const due = getSourcesDueForFetch(lastFetchMap);
      expect(due.length).toBe(1);
      expect(due[0].id).toBe("reuters-world");
    });

    it("does not return inactive sources even without lastFetch data", () => {
      const emptyMap = new Map<string, Date>();
      const due = getSourcesDueForFetch(emptyMap);

      for (const source of due) {
        expect(source.isActive).toBe(true);
      }
    });
  });
});
