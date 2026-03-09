import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { validateApiKey } from "@/lib/sentinel/api-auth";
import { getUserSentinelTier } from "@/lib/sentinel/feature-gating";
import {
  getWatchlistMatches,
  updateWatchlist,
  deleteWatchlist,
  markMatchesRead,
} from "@/lib/sentinel/watchlists";

const updateWatchlistSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  items: z
    .array(
      z.object({
        value: z.string().min(1).max(200),
        label: z.string().max(200).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .min(1)
    .max(50)
    .optional(),
  isActive: z.boolean().optional(),
  alertOnMatch: z.boolean().optional(),
  description: z.string().max(500).optional(),
  markRead: z.boolean().optional(),
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

// GET — single watchlist with paginated matches
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await resolveAuth(req);
    if (result instanceof NextResponse) return result;
    const { userId } = result;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));

    const data = await getWatchlistMatches(id, userId, page, limit);

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Watchlist not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === "Access denied") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[Sentinel Watchlist GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// PATCH — update watchlist
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await resolveAuth(req);
    if (result instanceof NextResponse) return result;
    const { userId } = result;

    const body = await req.json();
    const parsed = updateWatchlistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { markRead, ...updates } = parsed.data;

    // Handle mark-read separately
    if (markRead) {
      await markMatchesRead(id, userId);
    }

    // Only call update if there are actual field changes
    const hasUpdates = Object.keys(updates).length > 0;
    const watchlist = hasUpdates
      ? await updateWatchlist(id, userId, updates)
      : null;

    return NextResponse.json({
      data: watchlist,
      ...(markRead ? { matchesMarkedRead: true } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Watchlist not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === "Access denied") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[Sentinel Watchlist PATCH]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE — soft-delete (deactivate)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await resolveAuth(req);
    if (result instanceof NextResponse) return result;
    const { userId } = result;

    await deleteWatchlist(id, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Watchlist not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === "Access denied") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[Sentinel Watchlist DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
