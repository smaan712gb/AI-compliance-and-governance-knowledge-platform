import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { calculateCrisisScore, calculateBatchCrisisScores } from "@/lib/sentinel/crisis-index";
import { validateApiKey } from "@/lib/sentinel/api-auth";
import { getUserSentinelTier } from "@/lib/sentinel/feature-gating";
import { checkRateLimit } from "@/lib/sentinel/rate-limiter";
import type { CrisisIndicators } from "@/lib/sentinel/types";

// Default indicators for demo/overview (would come from GDELT/ACLED in production)
const DEFAULT_COUNTRY_INDICATORS: Record<string, CrisisIndicators> = {
  UA: { conflictEvents: 45, fatalities: 120, protestEvents: 8, militaryActivity: 30, internetOutages: 3, newsVelocity: 85 },
  SY: { conflictEvents: 30, fatalities: 65, protestEvents: 5, militaryActivity: 20, internetOutages: 2, newsVelocity: 40 },
  YE: { conflictEvents: 25, fatalities: 50, protestEvents: 12, militaryActivity: 18, internetOutages: 4, newsVelocity: 30 },
  AF: { conflictEvents: 20, fatalities: 40, protestEvents: 6, militaryActivity: 15, internetOutages: 2, newsVelocity: 25 },
  SD: { conflictEvents: 22, fatalities: 45, protestEvents: 15, militaryActivity: 12, internetOutages: 5, newsVelocity: 35 },
  IL: { conflictEvents: 15, fatalities: 25, protestEvents: 20, militaryActivity: 10, internetOutages: 0, newsVelocity: 95 },
  PS: { conflictEvents: 18, fatalities: 35, protestEvents: 25, militaryActivity: 5, internetOutages: 3, newsVelocity: 90 },
  IQ: { conflictEvents: 12, fatalities: 20, protestEvents: 8, militaryActivity: 8, internetOutages: 1, newsVelocity: 20 },
  TW: { conflictEvents: 0, fatalities: 0, protestEvents: 3, militaryActivity: 5, internetOutages: 0, newsVelocity: 45 },
  RU: { conflictEvents: 8, fatalities: 15, protestEvents: 5, militaryActivity: 25, internetOutages: 1, newsVelocity: 60 },
  IR: { conflictEvents: 5, fatalities: 10, protestEvents: 15, militaryActivity: 8, internetOutages: 2, newsVelocity: 40 },
  CN: { conflictEvents: 2, fatalities: 0, protestEvents: 3, militaryActivity: 12, internetOutages: 0, newsVelocity: 35 },
  US: { conflictEvents: 1, fatalities: 2, protestEvents: 8, militaryActivity: 3, internetOutages: 0, newsVelocity: 50 },
  GB: { conflictEvents: 0, fatalities: 0, protestEvents: 4, militaryActivity: 2, internetOutages: 0, newsVelocity: 20 },
  DE: { conflictEvents: 0, fatalities: 0, protestEvents: 5, militaryActivity: 1, internetOutages: 0, newsVelocity: 15 },
};

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
      // Single country
      const indicators = DEFAULT_COUNTRY_INDICATORS[countryCode.toUpperCase()] || {
        conflictEvents: 0, fatalities: 0, protestEvents: 0,
        militaryActivity: 0, internetOutages: 0, newsVelocity: 0,
      };
      const score = calculateCrisisScore(countryCode, indicators);
      return NextResponse.json({ data: score });
    }

    // All tracked countries
    const countryData = Object.entries(DEFAULT_COUNTRY_INDICATORS).map(
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
