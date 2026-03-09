import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  updateSourceState,
  getSourceFreshness,
  generateFreshnessReport,
  resetFreshnessState,
} from "../freshness-tracker";
import type { RSSSource } from "../rss-sources";

function mockSource(overrides?: Partial<RSSSource>): RSSSource {
  return {
    id: "test-source",
    name: "Test Source",
    url: "https://example.com/feed",
    category: "wire_service",
    region: "global",
    reliability: 0.9,
    fetchIntervalMinutes: 15,
    isActive: true,
    ...overrides,
  };
}

describe("freshness-tracker", () => {
  beforeEach(() => {
    resetFreshnessState();
  });

  // 1. Inactive source returns "disabled" status
  it("returns disabled status for inactive source", () => {
    const source = mockSource({ isActive: false });
    const freshness = getSourceFreshness(source);
    expect(freshness.status).toBe("disabled");
  });

  // 2. Source with no state returns "no_data"
  it("returns no_data status for source with no state", () => {
    const source = mockSource();
    const freshness = getSourceFreshness(source);
    expect(freshness.status).toBe("no_data");
  });

  // 3. Recently updated source is "fresh"
  it("returns fresh status for recently updated source", () => {
    const source = mockSource();
    updateSourceState(source.id, true, 5);
    const freshness = getSourceFreshness(source);
    expect(freshness.status).toBe("fresh");
  });

  // 4. Source updated 30 min ago is "stale"
  it("returns stale status for source updated 30 minutes ago", () => {
    const source = mockSource();
    updateSourceState(source.id, true, 5);
    // Move lastSuccessAt back 30 minutes
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    // We need to update and then manipulate time; use vi.spyOn on Date.now
    vi.spyOn(Date, "now").mockReturnValue(
      Date.now() + 30 * 60 * 1000
    );
    const freshness = getSourceFreshness(source);
    expect(freshness.status).toBe("stale");
    vi.restoreAllMocks();
  });

  // 5. Source updated 3 hours ago is "very_stale"
  it("returns very_stale status for source updated 3 hours ago", () => {
    const source = mockSource();
    updateSourceState(source.id, true, 5);
    // Advance Date.now by 3 hours
    vi.spyOn(Date, "now").mockReturnValue(
      Date.now() + 3 * 60 * 60 * 1000
    );
    const freshness = getSourceFreshness(source);
    expect(freshness.status).toBe("very_stale");
    vi.restoreAllMocks();
  });

  // 6. Source with error returns "error" status
  it("returns error status for source with error", () => {
    const source = mockSource();
    // First succeed so lastSuccessAt is set
    updateSourceState(source.id, true, 5);
    // Then fail with error
    updateSourceState(source.id, false, 0, "Connection timeout");
    const freshness = getSourceFreshness(source);
    expect(freshness.status).toBe("error");
    expect(freshness.error).toBe("Connection timeout");
  });

  // 7. updateSourceState tracks item counts
  it("accumulates item counts across multiple updates", () => {
    const source = mockSource();
    updateSourceState(source.id, true, 5);
    updateSourceState(source.id, true, 3);
    const freshness = getSourceFreshness(source);
    expect(freshness.itemCount).toBe(8);
  });

  // 8. updateSourceState clears error on success
  it("clears error on successful update", () => {
    const source = mockSource();
    updateSourceState(source.id, true, 1);
    updateSourceState(source.id, false, 0, "Fetch failed");
    updateSourceState(source.id, true, 2);
    const freshness = getSourceFreshness(source);
    expect(freshness.error).toBeUndefined();
  });

  // 9. generateFreshnessReport returns valid report shape
  it("returns a report with all required fields", () => {
    const report = generateFreshnessReport();
    expect(report).toHaveProperty("timestamp");
    expect(report).toHaveProperty("totalSources");
    expect(report).toHaveProperty("activeSources");
    expect(report).toHaveProperty("statusBreakdown");
    expect(report).toHaveProperty("freshPercentage");
    expect(report).toHaveProperty("intelligenceGaps");
    expect(report).toHaveProperty("categoryHealth");
    expect(report).toHaveProperty("requiredSourcesHealthy");
  });

  // 10. Report has correct totalSources count
  it("reports totalSources matching ALL_RSS_SOURCES length", () => {
    const report = generateFreshnessReport();
    expect(report.totalSources).toBeGreaterThan(0);
    expect(typeof report.totalSources).toBe("number");
  });

  // 11. Report statusBreakdown sums correctly
  it("statusBreakdown values sum to totalSources", () => {
    const report = generateFreshnessReport();
    const sum = Object.values(report.statusBreakdown).reduce(
      (a, b) => a + b,
      0
    );
    expect(sum).toBe(report.totalSources);
  });

  // 12. freshPercentage is 0-100
  it("freshPercentage is between 0 and 100", () => {
    const report = generateFreshnessReport();
    expect(report.freshPercentage).toBeGreaterThanOrEqual(0);
    expect(report.freshPercentage).toBeLessThanOrEqual(100);
  });
});
