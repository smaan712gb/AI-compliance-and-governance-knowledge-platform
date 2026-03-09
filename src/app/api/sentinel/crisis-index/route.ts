import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateCrisisScore, calculateBatchCrisisScores } from "@/lib/sentinel/crisis-index";
import { validateApiKey } from "@/lib/sentinel/api-auth";
import { getUserSentinelTier } from "@/lib/sentinel/feature-gating";
import { checkRateLimit } from "@/lib/sentinel/rate-limiter";
import type { CrisisIndicators } from "@/lib/sentinel/types";

export const dynamic = "force-dynamic";

// ---- Derive crisis indicators from real IntelligenceEvent data ----

async function deriveIndicatorsFromDB(
  countryCode?: string
): Promise<Record<string, CrisisIndicators>> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const baseWhere = {
    processedAt: { gte: sevenDaysAgo },
    countryCode: countryCode
      ? countryCode.toUpperCase()
      : { not: null as unknown as string },
  };

  // Get all events grouped by country + category
  const byCategoryCountry = await db.intelligenceEvent.groupBy({
    by: ["countryCode", "category"],
    where: baseWhere,
    _count: true,
  });

  // Get severity counts by country
  const bySeverityCountry = await db.intelligenceEvent.groupBy({
    by: ["countryCode", "severity"],
    where: baseWhere,
    _count: true,
  });

  // Get total event count by country (proxy for news velocity)
  const totalByCountry = await db.intelligenceEvent.groupBy({
    by: ["countryCode"],
    where: baseWhere,
    _count: true,
  });

  // Build indicators per country
  const indicators: Record<string, CrisisIndicators> = {};

  // Initialize countries from total counts
  for (const row of totalByCountry) {
    if (!row.countryCode) continue;
    indicators[row.countryCode] = {
      conflictEvents: 0,
      fatalities: 0, // estimated from severity
      protestEvents: 0,
      militaryActivity: 0,
      internetOutages: 0,
      newsVelocity: Math.min(100, row._count), // total events = news velocity proxy
    };
  }

  // Fill in category-based indicators
  for (const row of byCategoryCountry) {
    if (!row.countryCode || !indicators[row.countryCode]) continue;
    const ind = indicators[row.countryCode];

    switch (row.category) {
      case "CONFLICT":
        ind.conflictEvents += row._count;
        break;
      case "TERRORISM":
        ind.conflictEvents += row._count; // terrorism = conflict indicator
        ind.militaryActivity += Math.ceil(row._count * 0.5);
        break;
      case "POLITICAL":
        ind.protestEvents += row._count;
        break;
      case "CYBER":
        ind.internetOutages += Math.ceil(row._count * 0.3); // cyber = partial internet disruption proxy
        break;
      case "DISASTER":
        // Disasters contribute to overall instability but less to conflict
        break;
      case "ECONOMIC":
        // Economic events indicate sanctions/trade pressure
        ind.protestEvents += Math.ceil(row._count * 0.2);
        break;
      case "SANCTIONS":
        ind.militaryActivity += Math.ceil(row._count * 0.5);
        break;
    }
  }

  // Estimate fatalities from severity distribution (no real fatality data without ACLED)
  for (const row of bySeverityCountry) {
    if (!row.countryCode || !indicators[row.countryCode]) continue;
    const ind = indicators[row.countryCode];

    switch (row.severity) {
      case "SENTINEL_CRITICAL":
        ind.fatalities += row._count * 8; // critical events = high estimated impact
        ind.militaryActivity += row._count;
        break;
      case "SENTINEL_HIGH":
        ind.fatalities += row._count * 3;
        ind.militaryActivity += Math.ceil(row._count * 0.5);
        break;
      case "SENTINEL_MEDIUM":
        ind.fatalities += row._count * 1;
        break;
    }
  }

  return indicators;
}

export async function GET(req: NextRequest) {
  try {
    // Auth
    let userId: string | undefined;
    let tier: import("@/lib/sentinel/types").SentinelTier = "FREE";

    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("stl_") || authHeader?.includes("stl_")) {
      const validation = await validateApiKey(authHeader);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 401 });
      }
      userId = validation.userId;
      tier = validation.tier!;
    } else {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = session.user.id;
      tier = await getUserSentinelTier(userId);
    }

    // Rate limit
    const rateLimit = await checkRateLimit(userId!, tier, "crisis-index");
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const countryCode = searchParams.get("countryCode");

    if (countryCode) {
      // Single country — derive indicators from real data
      const allIndicators = await deriveIndicatorsFromDB(countryCode);
      const indicators = allIndicators[countryCode.toUpperCase()] || {
        conflictEvents: 0,
        fatalities: 0,
        protestEvents: 0,
        militaryActivity: 0,
        internetOutages: 0,
        newsVelocity: 0,
      };
      const score = calculateCrisisScore(countryCode, indicators);
      return NextResponse.json({ data: score });
    }

    // All countries with events in the last 7 days
    const allIndicators = await deriveIndicatorsFromDB();

    const countryData = Object.entries(allIndicators).map(
      ([code, indicators]) => ({ countryCode: code, indicators })
    );
    const scores = calculateBatchCrisisScores(countryData);

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    return NextResponse.json({ data: scores });
  } catch (error) {
    console.error("[Sentinel Crisis Index] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
