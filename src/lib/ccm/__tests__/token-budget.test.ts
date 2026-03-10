import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db
vi.mock("@/lib/db", () => ({
  db: {
    cCMAuditLog: {
      create: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

// Mock feature-gating
vi.mock("@/lib/ccm/feature-gating", () => ({
  getOrgCCMTier: vi.fn().mockResolvedValue("starter"),
}));

import { db } from "@/lib/db";
import { getOrgCCMTier } from "@/lib/ccm/feature-gating";
import {
  checkTokenBudget,
  estimateCost,
  getTokenUsageSummary,
} from "../token-budget";

const mockGetOrgCCMTier = vi.mocked(getOrgCCMTier);
const mockFindMany = vi.mocked(db.cCMAuditLog.findMany);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetOrgCCMTier.mockResolvedValue("starter");
  mockFindMany.mockResolvedValue([]);
});

// ---- estimateCost ----

describe("estimateCost", () => {
  it("returns correct cost for deepseek-reasoner", () => {
    // 1M tokens at $2.0/M = $2.0
    expect(estimateCost(1_000_000, "deepseek-reasoner")).toBe(2.0);
  });

  it("returns correct cost for gpt-4o", () => {
    // 500K tokens at $5.0/M = $2.5
    expect(estimateCost(500_000, "gpt-4o")).toBe(2.5);
  });

  it("returns correct cost for gpt-4o-mini", () => {
    // 1M tokens at $0.15/M = $0.15
    expect(estimateCost(1_000_000, "gpt-4o-mini")).toBe(0.15);
  });

  it("uses default rate for unknown models", () => {
    // 1M tokens at $1.0/M (default) = $1.0
    expect(estimateCost(1_000_000, "unknown-model")).toBe(1.0);
  });

  it("returns 0 for 0 tokens", () => {
    expect(estimateCost(0, "gpt-4o")).toBe(0);
  });
});

// ---- checkTokenBudget ----

describe("checkTokenBudget", () => {
  it("returns PROCEED when under budget", async () => {
    // Starter: 50K daily, 1M monthly. Usage: 10K daily, 10K monthly
    mockFindMany.mockResolvedValue([
      { details: { totalTokens: 10_000 } },
    ] as any);

    const status = await checkTokenBudget("org-1", 1000);
    expect(status.recommendedAction).toBe("PROCEED");
    expect(status.isOverBudget).toBe(false);
    expect(status.dailyLimit).toBe(50_000);
    expect(status.monthlyLimit).toBe(1_000_000);
  });

  it("returns THROTTLE when at 80% of daily limit", async () => {
    // 41K used of 50K daily limit = 82% => THROTTLE
    mockFindMany.mockResolvedValue([
      { details: { totalTokens: 41_000 } },
    ] as any);

    const status = await checkTokenBudget("org-1", 1000);
    expect(status.recommendedAction).toBe("THROTTLE");
    expect(status.dailyUsed).toBe(41_000);
  });

  it("returns BLOCK when over daily limit by >20%", async () => {
    // 65K used of 50K daily limit = 130% => BLOCK
    mockFindMany.mockResolvedValue([
      { details: { totalTokens: 65_000 } },
    ] as any);

    const status = await checkTokenBudget("org-1", 1000);
    expect(status.recommendedAction).toBe("BLOCK");
    expect(status.isOverBudget).toBe(true);
  });

  it("returns BLOCK when over monthly limit", async () => {
    // First call (daily) returns low usage, second (monthly) returns >1.2M
    let callCount = 0;
    mockFindMany.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return [{ details: { totalTokens: 5_000 } }] as any;
      return [{ details: { totalTokens: 1_300_000 } }] as any;
    });

    const status = await checkTokenBudget("org-1", 1000);
    expect(status.isOverBudget).toBe(true);
    expect(status.recommendedAction).toBe("BLOCK");
  });

  it("enterprise tier is never blocked (unlimited)", async () => {
    mockGetOrgCCMTier.mockResolvedValue("enterprise");

    const status = await checkTokenBudget("org-1", 999_999);
    expect(status.recommendedAction).toBe("PROCEED");
    expect(status.isOverBudget).toBe(false);
    expect(status.dailyLimit).toBe(-1);
    expect(status.monthlyLimit).toBe(-1);
    // Should not query DB at all for unlimited tier
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("starter tier has correct limits (50K daily, 1M monthly)", async () => {
    mockGetOrgCCMTier.mockResolvedValue("starter");
    mockFindMany.mockResolvedValue([]);

    const status = await checkTokenBudget("org-1", 100);
    expect(status.dailyLimit).toBe(50_000);
    expect(status.monthlyLimit).toBe(1_000_000);
  });

  it("none tier blocks all requests", async () => {
    mockGetOrgCCMTier.mockResolvedValue("none");

    const status = await checkTokenBudget("org-1", 100);
    expect(status.recommendedAction).toBe("BLOCK");
    expect(status.isOverBudget).toBe(true);
    expect(status.dailyLimit).toBe(0);
    expect(status.monthlyLimit).toBe(0);
  });
});

// ---- getTokenUsageSummary ----

describe("getTokenUsageSummary", () => {
  it("correctly aggregates by operation", async () => {
    mockFindMany.mockResolvedValue([
      { details: { totalTokens: 1000, costUsd: 0.01, operation: "analysis", model: "gpt-4o" }, timestamp: new Date() },
      { details: { totalTokens: 2000, costUsd: 0.02, operation: "analysis", model: "gpt-4o" }, timestamp: new Date() },
      { details: { totalTokens: 500, costUsd: 0.005, operation: "reasoning", model: "deepseek-reasoner" }, timestamp: new Date() },
    ] as any);

    const summary = await getTokenUsageSummary("org-1", "day");
    expect(summary.byOperation.analysis).toBe(3000);
    expect(summary.byOperation.reasoning).toBe(500);
    expect(summary.totalTokens).toBe(3500);
  });

  it("correctly aggregates by model", async () => {
    mockFindMany.mockResolvedValue([
      { details: { totalTokens: 1000, costUsd: 0.01, operation: "analysis", model: "gpt-4o" }, timestamp: new Date() },
      { details: { totalTokens: 2000, costUsd: 0.02, operation: "reasoning", model: "deepseek-reasoner" }, timestamp: new Date() },
    ] as any);

    const summary = await getTokenUsageSummary("org-1", "month");
    expect(summary.byModel["gpt-4o"]).toBe(1000);
    expect(summary.byModel["deepseek-reasoner"]).toBe(2000);
  });

  it("returns cost estimates", async () => {
    mockFindMany.mockResolvedValue([
      { details: { totalTokens: 10_000, costUsd: 0.05, operation: "analysis", model: "gpt-4o" }, timestamp: new Date() },
      { details: { totalTokens: 5_000, costUsd: 0.01, operation: "report", model: "gpt-4o-mini" }, timestamp: new Date() },
    ] as any);

    const summary = await getTokenUsageSummary("org-1", "week");
    expect(summary.totalCost).toBe(0.06);
    expect(summary.totalTokens).toBe(15_000);
  });

  it("returns empty aggregates when no logs", async () => {
    mockFindMany.mockResolvedValue([]);

    const summary = await getTokenUsageSummary("org-1", "day");
    expect(summary.totalTokens).toBe(0);
    expect(summary.totalCost).toBe(0);
    expect(Object.keys(summary.byOperation)).toHaveLength(0);
    expect(Object.keys(summary.byModel)).toHaveLength(0);
    expect(summary.trend).toHaveLength(0);
  });

  it("builds correct trend data grouped by date", async () => {
    const date1 = new Date("2026-03-08T10:00:00Z");
    const date2 = new Date("2026-03-09T14:00:00Z");
    mockFindMany.mockResolvedValue([
      { details: { totalTokens: 1000, costUsd: 0.01, operation: "analysis", model: "gpt-4o" }, timestamp: date1 },
      { details: { totalTokens: 2000, costUsd: 0.02, operation: "analysis", model: "gpt-4o" }, timestamp: date1 },
      { details: { totalTokens: 500, costUsd: 0.005, operation: "analysis", model: "gpt-4o" }, timestamp: date2 },
    ] as any);

    const summary = await getTokenUsageSummary("org-1", "week");
    expect(summary.trend).toHaveLength(2);
    expect(summary.trend[0].date).toBe("2026-03-08");
    expect(summary.trend[0].tokens).toBe(3000);
    expect(summary.trend[1].date).toBe("2026-03-09");
    expect(summary.trend[1].tokens).toBe(500);
  });
});
