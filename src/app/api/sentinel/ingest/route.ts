import { NextRequest, NextResponse } from "next/server";
import { runIngestionPipeline, type IngestionResult } from "@/lib/sentinel/feed-ingestion";
import type { KeywordSpike, GeographicConvergence } from "@/lib/sentinel/pattern-detection";
import { updateSourceState } from "@/lib/sentinel/freshness-tracker";
import { generateFreshnessReport, type FreshnessReport } from "@/lib/sentinel/freshness-tracker";
import { broadcastAlertToAll, buildKeywordSpikeAlert, buildCrisisEscalationAlert } from "@/lib/sentinel/webhook-alerts";
import { fetchBatchGdeltVolumes, GDELT_PRIORITY_COUNTRIES } from "@/lib/sentinel/gdelt-client";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface IngestStatus {
  result: IngestionResult | null;
  spikes: KeywordSpike[];
  convergences: GeographicConvergence[];
  freshnessReport: FreshnessReport | null;
  completedAt: string;
  error?: string;
}

// Module-level state for the GET endpoint
let lastIngestStatus: IngestStatus | null = null;
let isRunning = false;

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isRunning) {
    return NextResponse.json(
      { error: "Ingestion already running" },
      { status: 409 },
    );
  }

  // Fire-and-forget: respond 202 immediately, process in background
  isRunning = true;

  void (async () => {
    try {
      // --- Phase 1: RSS Ingestion (with built-in automation) ---
      const result = await runIngestionPipeline();

      // Update freshness state for each processed source
      for (const err of result.errors) {
        updateSourceState(err.sourceId, false, 0, err.error);
      }

      const freshnessReport = generateFreshnessReport();

      // --- Phase 2: GDELT News Velocity Enrichment ---
      // Fetch for top 10 priority countries (rate-limited, ~60s)
      try {
        const gdeltCountries = GDELT_PRIORITY_COUNTRIES.slice(0, 10);
        const gdeltVolumes = await fetchBatchGdeltVolumes(gdeltCountries);
        console.log(`[sentinel/ingest] GDELT: fetched ${gdeltVolumes.length} country volumes`);
      } catch (gdeltErr) {
        console.error("[sentinel/ingest] GDELT enrichment failed:", gdeltErr);
      }

      // --- Phase 3: Webhook Broadcasts for Pattern Alerts ---
      const { keywordSpikes, geoConvergences } = result.automation;

      // Broadcast keyword spike alerts to all webhook subscribers
      for (const spike of keywordSpikes) {
        try {
          const payload = buildKeywordSpikeAlert({
            keyword: spike.keyword,
            currentCount: spike.currentCount,
            baselineAvg: spike.baselineAvg,
            ratio: spike.ratio,
            sources: spike.sources,
          });
          await broadcastAlertToAll(payload);
        } catch {
          // Webhook failure is non-fatal
        }
      }

      // Broadcast geographic convergence alerts
      for (const conv of geoConvergences) {
        try {
          const payload = buildCrisisEscalationAlert({
            countryCode: conv.countryCode,
            previousLevel: "stable",
            newLevel: conv.severity,
            score: conv.eventCount * 10,
            triggers: conv.eventTypes,
          });
          await broadcastAlertToAll(payload);
        } catch {
          // Webhook failure is non-fatal
        }
      }

      lastIngestStatus = {
        result,
        spikes: keywordSpikes,
        convergences: geoConvergences,
        freshnessReport,
        completedAt: new Date().toISOString(),
      };

      console.log(
        `[sentinel/ingest] Completed: ${result.sourcesProcessed} sources, ` +
        `${result.itemsNew} new, ${result.itemsSkipped} skipped, ` +
        `${result.automation.watchlistMatches} watchlist matches, ` +
        `${result.automation.graphEntitiesLinked} graph links, ` +
        `${result.automation.reasoningTriggered} AI analyses, ` +
        `${keywordSpikes.length} spikes, ${geoConvergences.length} convergences, ` +
        `${result.durationMs}ms`,
      );
    } catch (err) {
      console.error("[sentinel/ingest] Background pipeline error:", err);
      lastIngestStatus = {
        result: null,
        spikes: [],
        convergences: [],
        freshnessReport: null,
        completedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      isRunning = false;
    }
  })();

  return NextResponse.json({ status: "started" }, { status: 202 });
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    isRunning,
    lastResult: lastIngestStatus,
  });
}
