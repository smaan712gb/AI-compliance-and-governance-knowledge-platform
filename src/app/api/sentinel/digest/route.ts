import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { db } from "@/lib/db";
import { analyzeEvent } from "@/lib/sentinel/reasoning";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST /api/sentinel/digest
 * Automated daily intelligence digest — generates an AI-powered summary
 * of the most significant events from the last 24 hours.
 * Triggered by cron-job.org once daily.
 *
 * Uses Next.js `after()` to run DeepSeek R1 analysis after the response
 * is sent, avoiding cron-job.org's 30s timeout.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Schedule background work AFTER the response is sent
  after(async () => {
    try {
      await runDigestInBackground();
    } catch (err) {
      console.error("[sentinel/digest] Background digest failed:", err);
    }
  });

  return NextResponse.json(
    { status: "accepted", message: "Digest generation started in background" },
    { status: 202 },
  );
}

/**
 * Runs the full digest pipeline in background.
 * Queries events, calls DeepSeek R1, stores results.
 */
async function runDigestInBackground(): Promise<void> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get top events from last 24 hours by severity and risk score
  const topEvents = await db.intelligenceEvent.findMany({
    where: {
      processedAt: { gte: twentyFourHoursAgo },
      severity: { in: ["SENTINEL_CRITICAL", "SENTINEL_HIGH", "SENTINEL_MEDIUM"] },
    },
    orderBy: { riskScore: "desc" },
    take: 20,
    select: {
      id: true,
      headline: true,
      summary: true,
      category: true,
      severity: true,
      countryCode: true,
      riskScore: true,
      source: true,
      processedAt: true,
    },
  });

  if (topEvents.length === 0) {
    console.log("[sentinel/digest] No significant events in last 24h — skipping");
    return;
  }

  // Get category breakdown
  const categoryBreakdown = await db.intelligenceEvent.groupBy({
    by: ["category"],
    where: { processedAt: { gte: twentyFourHoursAgo } },
    _count: true,
  });

  // Get country hotspots
  const countryBreakdown = await db.intelligenceEvent.groupBy({
    by: ["countryCode"],
    where: {
      processedAt: { gte: twentyFourHoursAgo },
      countryCode: { not: null },
    },
    _count: true,
    orderBy: { _count: { countryCode: "desc" } },
    take: 10,
  });

  // Build digest prompt from top events
  const eventSummaries = topEvents
    .slice(0, 10)
    .map((e, i) => `${i + 1}. [${e.severity.replace("SENTINEL_", "")}] [${e.category}] ${e.countryCode || "GLOBAL"}: ${e.headline}`)
    .join("\n");

  const categories = categoryBreakdown
    .map((c) => `${c.category}: ${c._count}`)
    .join(", ");

  const hotspots = countryBreakdown
    .map((c) => `${c.countryCode}: ${c._count} events`)
    .join(", ");

  // Generate AI digest using the reasoning engine (this is the slow call: 20-60s)
  const digestAnalysis = await analyzeEvent({
    headline: `DAILY INTELLIGENCE DIGEST — ${new Date().toISOString().split("T")[0]}`,
    content: `Summarize and assess the following top intelligence events from the last 24 hours as a daily briefing:\n\n${eventSummaries}\n\nCategory breakdown: ${categories}\nGeographic hotspots: ${hotspots}\n\nProvide strategic assessment of the day's most significant developments, emerging patterns, and recommended watch priorities for the next 24 hours.`,
    source: "SENTINEL Auto-Digest",
  });

  // Store as a briefing for all org admins
  const orgAdmins = await db.sentinelOrgMember.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { userId: true },
    distinct: ["userId"],
  });

  const digestDate = new Date().toISOString().split("T")[0];

  for (const admin of orgAdmins) {
    try {
      await db.reasoningHistory.create({
        data: {
          userId: admin.userId,
          headline: `Daily Intelligence Digest — ${digestDate}`,
          category: digestAnalysis.category,
          inputContext: `${topEvents.length} events analyzed. Top categories: ${categories}. Hotspots: ${hotspots}`,
          reasoningChain: JSON.stringify(digestAnalysis.reasoning),
          classification: {
            category: digestAnalysis.category,
            severity: digestAnalysis.severity,
            riskScore: digestAnalysis.riskScore,
          },
          predictedOutcome: digestAnalysis.reasoning.whatHappensNext || null,
          tokens: digestAnalysis.reasoningTokens,
        },
      });
    } catch {
      // Individual storage failure is non-fatal
    }
  }

  console.log(
    `[sentinel/digest] Completed — ${topEvents.length} events, ${orgAdmins.length} admins notified, risk=${digestAnalysis.riskScore}`,
  );
}
