import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { validateApiKey } from "@/lib/sentinel/api-auth";
import { getUserSentinelTier } from "@/lib/sentinel/feature-gating";
import { createWatchlist, getUserWatchlists } from "@/lib/sentinel/watchlists";

const WATCHLIST_TYPES = ["COUNTRY", "ENTITY", "KEYWORD", "SUPPLIER", "SECTOR", "ROUTE"] as const;

const createWatchlistSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(WATCHLIST_TYPES),
  items: z
    .array(
      z.object({
        value: z.string().min(1).max(200),
        label: z.string().max(200).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .min(1)
    .max(50),
  description: z.string().max(500).optional(),
  alertOnMatch: z.boolean().optional(),
});

async function resolveAuth(
  req: NextRequest
): Promise<{ userId: string; tier: string } | NextResponse> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("stl_") || authHeader?.includes("stl_")) {
    const validation = await validateApiKey(authHeader);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 401 });
    }
    return { userId: validation.userId!, tier: validation.tier! };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getUserSentinelTier(session.user.id);
  return { userId: session.user.id, tier };
}

// GET — list user watchlists
export async function GET(req: NextRequest) {
  try {
    const result = await resolveAuth(req);
    if (result instanceof NextResponse) return result;
    const { userId } = result;

    const watchlists = await getUserWatchlists(userId);

    return NextResponse.json({ data: watchlists });
  } catch (error) {
    console.error("[Sentinel Watchlists GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST — create watchlist (PRO+ only)
export async function POST(req: NextRequest) {
  try {
    const result = await resolveAuth(req);
    if (result instanceof NextResponse) return result;
    const { userId, tier } = result;

    // Feature gate: PRO+ only
    if (tier === "FREE") {
      return NextResponse.json(
        { error: "Watchlists require a Pro or higher subscription" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createWatchlistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, type, items, description, alertOnMatch } = parsed.data;

    const watchlist = await createWatchlist(
      userId,
      name,
      type,
      items,
      description,
      alertOnMatch
    );

    return NextResponse.json({ data: watchlist }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("[Sentinel Watchlists POST]", error);

    if (message === "At least one watchlist item is required" || message.includes("Maximum")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
