import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateApiKey } from "@/lib/sentinel/api-auth";
import { getUserSentinelTier } from "@/lib/sentinel/feature-gating";
import { checkRateLimit } from "@/lib/sentinel/rate-limiter";

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
    const rateLimit = await checkRateLimit(userId!, tier, "intelligence");
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const severity = searchParams.get("severity");
    const countryCode = searchParams.get("countryCode");
    const limit = Math.min(500, Number(searchParams.get("limit")) || 25);
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    const where: Record<string, unknown> = {};
    if (category) where.category = category.toUpperCase();
    if (severity) where.severity = `SENTINEL_${severity.toUpperCase()}`;
    if (countryCode) where.countryCode = countryCode.toUpperCase();

    const [events, total] = await Promise.all([
      db.intelligenceEvent.findMany({
        where,
        orderBy: { processedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.intelligenceEvent.count({ where }),
    ]);

    return NextResponse.json({
      data: events,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("[Sentinel Intelligence] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
