import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/sentinel/dashboard
 * Aggregated intelligence command center data — one call, all widgets.
 */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    // Top threats (last 24h, CRITICAL + HIGH)
    topThreats,
    // Event counts by severity (last 24h)
    severityCounts,
    // Category breakdown (last 24h)
    categoryBreakdown,
    // Recent AI reasoning analyses
    recentReasoning,
    // AI reasoning stats (total + last 24h)
    reasoningStats24h,
    reasoningStatsTotal,
    // Active cases
    caseStats,
    // Country hotspots (last 7 days)
    countryHotspots,
    // Supply chain alerts (unread)
    supplyChainAlerts,
    // Recent triage runs
    recentTriage,
    // Total events (last 24h)
    eventCount24h,
    // Total events all time
    eventCountTotal,
  ] = await Promise.all([
    // Top threats
    db.intelligenceEvent.findMany({
      where: {
        processedAt: { gte: twentyFourHoursAgo },
        severity: { in: ["SENTINEL_CRITICAL", "SENTINEL_HIGH"] },
      },
      orderBy: { riskScore: "desc" },
      take: 8,
      select: {
        id: true,
        headline: true,
        category: true,
        severity: true,
        countryCode: true,
        riskScore: true,
        source: true,
        processedAt: true,
      },
    }),

    // Severity counts
    db.intelligenceEvent.groupBy({
      by: ["severity"],
      where: { processedAt: { gte: twentyFourHoursAgo } },
      _count: true,
    }),

    // Category breakdown
    db.intelligenceEvent.groupBy({
      by: ["category"],
      where: { processedAt: { gte: twentyFourHoursAgo } },
      _count: true,
      orderBy: { _count: { category: "desc" } },
    }),

    // Recent reasoning with predictions
    db.reasoningHistory.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        headline: true,
        category: true,
        classification: true,
        predictedOutcome: true,
        createdAt: true,
        countryCode: true,
      },
    }),

    // Reasoning stats (24h)
    db.reasoningHistory.count({
      where: { createdAt: { gte: twentyFourHoursAgo } },
    }),

    // Reasoning stats (all time)
    db.reasoningHistory.count(),

    // Case stats
    db.sentinelCase.groupBy({
      by: ["status"],
      _count: true,
    }).catch(() => []),

    // Country hotspots (7 days)
    db.intelligenceEvent.groupBy({
      by: ["countryCode"],
      where: {
        processedAt: { gte: sevenDaysAgo },
        countryCode: { not: null },
        severity: { in: ["SENTINEL_CRITICAL", "SENTINEL_HIGH", "SENTINEL_MEDIUM"] },
      },
      _count: true,
      orderBy: { _count: { countryCode: "desc" } },
      take: 10,
    }),

    // Supply chain alerts (recent)
    db.supplyChainAlert.findMany({
      where: { isRead: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        alertType: true,
        riskChange: true,
        newRiskScore: true,
        impactSummary: true,
        createdAt: true,
        supplier: { select: { name: true, countryCode: true } },
      },
    }).catch(() => []),

    // Recent triage runs
    db.sentinelTriageRun.findMany({
      where: { status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        stagesCompleted: true,
        crisisScore: true,
        durationMs: true,
        createdAt: true,
        event: { select: { headline: true, severity: true, countryCode: true } },
      },
    }).catch(() => []),

    // 24h count
    db.intelligenceEvent.count({
      where: { processedAt: { gte: twentyFourHoursAgo } },
    }),

    // Total count
    db.intelligenceEvent.count(),
  ]);

  // Build severity map
  const severityMap: Record<string, number> = {};
  for (const s of severityCounts) {
    severityMap[s.severity] = s._count;
  }

  // Build category map
  const categories = categoryBreakdown.map((c) => ({
    category: c.category,
    count: c._count,
  }));

  // Build case stats
  const cases: Record<string, number> = {};
  for (const c of (caseStats as { status: string; _count: number }[])) {
    cases[c.status] = c._count;
  }

  return NextResponse.json({
    data: {
      // Hero metrics
      metrics: {
        eventsLast24h: eventCount24h,
        eventsTotal: eventCountTotal,
        criticalAlerts: (severityMap["SENTINEL_CRITICAL"] || 0),
        highAlerts: (severityMap["SENTINEL_HIGH"] || 0),
        mediumAlerts: (severityMap["SENTINEL_MEDIUM"] || 0),
        aiAnalyses24h: reasoningStats24h,
        aiAnalysesTotal: reasoningStatsTotal,
        openCases: (cases["OPEN"] || 0) + (cases["IN_PROGRESS"] || 0),
        supplyChainAlerts: (supplyChainAlerts as unknown[]).length,
      },
      // Top threats (last 24h, ranked by risk)
      topThreats,
      // Category breakdown
      categories,
      // AI reasoning insights (predictions, assessments)
      recentReasoning,
      // Country hotspots
      countryHotspots: countryHotspots.map((c) => ({
        countryCode: c.countryCode,
        eventCount: c._count,
      })),
      // Supply chain impact alerts
      supplyChainAlerts,
      // Auto-triage activity
      recentTriage,
      // Case pipeline
      caseStats: cases,
    },
  });
}
