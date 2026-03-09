import { NextRequest, NextResponse } from "next/server";
import { runIngestionPipeline, type IngestionResult } from "@/lib/sentinel/feed-ingestion";
import { trackKeywords, trackGeoEvent, type KeywordSpike, type GeographicConvergence } from "@/lib/sentinel/pattern-detection";
import { updateSourceState } from "@/lib/sentinel/freshness-tracker";
import { generateFreshnessReport, type FreshnessReport } from "@/lib/sentinel/freshness-tracker";

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
    const allSpikes: KeywordSpike[] = [];
    const allConvergences: GeographicConvergence[] = [];

    try {
      const result = await runIngestionPipeline();

      // Update freshness state for each processed source
      for (const err of result.errors) {
        updateSourceState(err.sourceId, false, 0, err.error);
      }

      // Generate freshness report after ingestion
      const freshnessReport = generateFreshnessReport();

      lastIngestStatus = {
        result,
        spikes: allSpikes,
        convergences: allConvergences,
        freshnessReport,
        completedAt: new Date().toISOString(),
      };

      console.log(
        `[sentinel/ingest] Completed: ${result.sourcesProcessed} sources, ${result.itemsNew} new items, ${result.sourcesFailed} failed, ${result.durationMs}ms`,
      );
    } catch (err) {
      console.error("[sentinel/ingest] Background pipeline error:", err);
      lastIngestStatus = {
        result: null,
        spikes: allSpikes,
        convergences: allConvergences,
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
