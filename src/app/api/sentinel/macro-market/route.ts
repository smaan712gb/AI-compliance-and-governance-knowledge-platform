import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateApiKey } from "@/lib/sentinel/api-auth";
import { getUserSentinelTier } from "@/lib/sentinel/feature-gating";
import { checkRateLimit } from "@/lib/sentinel/rate-limiter";
import {
  generateMacroMarketReport,
  fetchCommodities,
  fetchForex,
  fetchTreasury,
  fetchSectorPerformance,
} from "@/lib/sentinel/macro-market";

export const dynamic = "force-dynamic";

const VALID_SECTIONS = ["all", "commodities", "forex", "treasury", "sectors", "signals"] as const;
type Section = (typeof VALID_SECTIONS)[number];

const FREE_SECTIONS: Section[] = ["commodities", "sectors"];

export async function GET(req: NextRequest) {
  try {
    // Auth
    let userId: string | undefined;
    let tier: "FREE" | "PRO" | "EXPERT" | "STRATEGIC" = "FREE";

    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("stl_") || authHeader?.includes("stl_")) {
      const apiKeyResult = await validateApiKey(authHeader);
      if (!apiKeyResult.valid) {
        return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
      }
      userId = apiKeyResult.userId;
      tier = apiKeyResult.tier as typeof tier;
    } else {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = session.user.id;
      tier = await getUserSentinelTier(userId);
    }

    // Rate limit
    const rateLimit = await checkRateLimit(userId!, tier, "macro-market");
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const section = (searchParams.get("section") || "all") as Section;

    if (!VALID_SECTIONS.includes(section)) {
      return NextResponse.json(
        { error: `Invalid section. Must be one of: ${VALID_SECTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Feature gating: FREE tier gets commodities + sectors only
    if (tier === "FREE" && section !== "all" && !FREE_SECTIONS.includes(section)) {
      return NextResponse.json(
        { error: "Forex, treasury, and signals data requires Pro tier or above" },
        { status: 403 }
      );
    }

    // Fetch requested section
    if (section === "all") {
      const report = await generateMacroMarketReport();

      // For FREE tier, strip restricted sections
      if (tier === "FREE") {
        return NextResponse.json({
          data: {
            commodities: report.commodities,
            sectors: report.sectors,
            timestamp: report.timestamp,
            _restricted: ["forex", "treasury", "signals"],
          },
        });
      }

      return NextResponse.json({ data: report });
    }

    if (section === "signals") {
      if (tier === "FREE") {
        return NextResponse.json(
          { error: "Signals data requires Pro tier or above" },
          { status: 403 }
        );
      }
      const report = await generateMacroMarketReport();
      return NextResponse.json({
        data: {
          signals: report.signals,
          riskScore: report.riskScore,
          overallRiskLevel: report.overallRiskLevel,
        },
      });
    }

    // Individual section fetchers
    const fetchers: Record<string, () => Promise<unknown>> = {
      commodities: fetchCommodities,
      forex: fetchForex,
      treasury: fetchTreasury,
      sectors: fetchSectorPerformance,
    };

    const result = await fetchers[section]();
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[Sentinel Macro Market] Error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
