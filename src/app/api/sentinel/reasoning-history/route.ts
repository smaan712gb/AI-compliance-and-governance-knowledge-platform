import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateApiKey } from "@/lib/sentinel/api-auth";
import { getUserSentinelTier } from "@/lib/sentinel/feature-gating";
import {
  getReasoningHistory,
  getReasoningStats,
} from "@/lib/sentinel/reasoning-history";
import type { EventCategory } from "@/lib/sentinel/types";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES: EventCategory[] = [
  "CONFLICT", "TERRORISM", "CYBER", "ECONOMIC",
  "POLITICAL", "DISASTER", "SANCTIONS", "OTHER",
];

/**
 * GET /api/sentinel/reasoning-history
 *
 * Query params:
 *   view=stats        — return dashboard stats instead of history list
 *   countryCode       — filter by ISO-2 country code
 *   category          — filter by EventCategory enum
 *   dateFrom          — ISO date string
 *   dateTo            — ISO date string
 *   page              — page number (default 1)
 *   limit             — items per page (default 20, max 100)
 */
export async function GET(req: NextRequest) {
  try {
    // ---- Auth: session or API key ----
    let userId: string | undefined;
    let tier: "FREE" | "PRO" | "EXPERT" | "STRATEGIC" = "FREE";

    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("stl_") || authHeader?.includes("stl_")) {
      const apiKeyResult = await validateApiKey(authHeader);
      if (!apiKeyResult.valid) {
        return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
      }
      userId = apiKeyResult.userId;
      tier = (apiKeyResult.tier as typeof tier) ?? "FREE";
    } else {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = session.user.id;
      tier = await getUserSentinelTier(userId);
    }

    // ---- Feature gating: PRO+ only ----
    if (tier === "FREE") {
      return NextResponse.json(
        { error: "Reasoning history requires Pro tier or above" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);

    // ---- Stats view ----
    if (searchParams.get("view") === "stats") {
      const stats = await getReasoningStats(userId!);
      return NextResponse.json({ data: stats });
    }

    // ---- History list with filters ----
    const countryCode = searchParams.get("countryCode") || undefined;
    const categoryParam = searchParams.get("category");
    const dateFromParam = searchParams.get("dateFrom");
    const dateToParam = searchParams.get("dateTo");
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    // Validate category
    let category: EventCategory | undefined;
    if (categoryParam) {
      if (!VALID_CATEGORIES.includes(categoryParam as EventCategory)) {
        return NextResponse.json(
          { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
          { status: 400 }
        );
      }
      category = categoryParam as EventCategory;
    }

    // Validate dates
    let dateFrom: Date | undefined;
    let dateTo: Date | undefined;
    if (dateFromParam) {
      dateFrom = new Date(dateFromParam);
      if (isNaN(dateFrom.getTime())) {
        return NextResponse.json({ error: "Invalid dateFrom format" }, { status: 400 });
      }
    }
    if (dateToParam) {
      dateTo = new Date(dateToParam);
      if (isNaN(dateTo.getTime())) {
        return NextResponse.json({ error: "Invalid dateTo format" }, { status: 400 });
      }
    }

    const page = pageParam ? parseInt(pageParam, 10) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const result = await getReasoningHistory(userId!, {
      countryCode,
      category,
      dateFrom,
      dateTo,
      page,
      limit,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[Sentinel Reasoning History] GET error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
