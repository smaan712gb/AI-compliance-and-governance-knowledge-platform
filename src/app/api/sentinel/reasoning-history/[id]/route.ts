import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateApiKey } from "@/lib/sentinel/api-auth";
import { getUserSentinelTier } from "@/lib/sentinel/feature-gating";
import { recordActualOutcome } from "@/lib/sentinel/reasoning-history";
import { db } from "@/lib/db";
import { z } from "zod/v4";

export const dynamic = "force-dynamic";

const outcomeSchema = z.object({
  actualOutcome: z.string().min(1, "actualOutcome is required"),
  forecastAccuracy: z.number().min(0).max(1),
});

async function authenticateRequest(
  req: NextRequest
): Promise<{ userId: string; tier: string } | NextResponse> {
  const authHeader = req.headers.get("authorization");

  if (authHeader?.startsWith("stl_") || authHeader?.includes("stl_")) {
    const apiKeyResult = await validateApiKey(authHeader);
    if (!apiKeyResult.valid) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }
    return {
      userId: apiKeyResult.userId!,
      tier: apiKeyResult.tier ?? "FREE",
    };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getUserSentinelTier(session.user.id);
  return { userId: session.user.id, tier };
}

/**
 * GET /api/sentinel/reasoning-history/[id]
 * Returns a single reasoning history entry with full details.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(req);
    if (authResult instanceof NextResponse) return authResult;

    const { userId, tier } = authResult;

    if (tier === "FREE") {
      return NextResponse.json(
        { error: "Reasoning history requires Pro tier or above" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const entry = await db.reasoningHistory.findUnique({
      where: { id },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    if (entry.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: entry });
  } catch (error) {
    console.error("[Sentinel Reasoning History] GET [id] error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/sentinel/reasoning-history/[id]
 * Record actual outcome and forecast accuracy.
 * Body: { actualOutcome: string, forecastAccuracy: number (0-1) }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(req);
    if (authResult instanceof NextResponse) return authResult;

    const { userId, tier } = authResult;

    if (tier === "FREE") {
      return NextResponse.json(
        { error: "Reasoning history requires Pro tier or above" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Verify ownership first
    const existing = await db.reasoningHistory.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    if (existing.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Parse and validate body
    const body = await req.json();
    const parsed = outcomeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updated = await recordActualOutcome(
      id,
      userId,
      parsed.data.actualOutcome,
      parsed.data.forecastAccuracy
    );

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[Sentinel Reasoning History] PATCH [id] error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
