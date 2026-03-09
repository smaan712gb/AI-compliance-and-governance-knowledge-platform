import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  generateFreshnessReport,
  getSourceFreshness,
} from "@/lib/sentinel/freshness-tracker";
import { ALL_RSS_SOURCES } from "@/lib/sentinel/rss-sources";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const freshnessReport = generateFreshnessReport();

    // Transform each RSS source into the sourceHealth shape the dashboard expects
    const sourceHealth = ALL_RSS_SOURCES.map((src) => {
      const freshness = getSourceFreshness(src);
      // The page expects only "fresh" | "stale" | "very_stale" | "no_data" | "error"
      // Map "disabled" → "no_data" since the page doesn't know about disabled
      const status =
        freshness.status === "disabled" ? "no_data" : freshness.status;

      return {
        sourceId: src.id,
        sourceName: src.name,
        category: src.category,
        status,
        lastFetched: freshness.lastFetchAt
          ? freshness.lastFetchAt.toISOString()
          : null,
        errorMessage: freshness.error ?? null,
      };
    });

    // Transform categoryHealth into intelligenceGaps format
    const intelligenceGaps = Object.entries(freshnessReport.categoryHealth).map(
      ([category, ch]) => ({
        category,
        sourceCount: ch.totalSources,
        freshCount: ch.freshSources,
        staleCount: ch.totalSources - ch.freshSources,
        missingCount: 0,
        status:
          ch.healthPercentage >= 80
            ? "covered"
            : ch.healthPercentage >= 40
              ? "partial"
              : "gap",
      })
    );

    return NextResponse.json({
      data: {
        lastIngestion: null,
        spikes: [],
        convergences: [],
        sourceHealth,
        intelligenceGaps,
      },
    });
  } catch (error) {
    console.error("[Sentinel Alerts] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate alerts data" },
      { status: 500 }
    );
  }
}
