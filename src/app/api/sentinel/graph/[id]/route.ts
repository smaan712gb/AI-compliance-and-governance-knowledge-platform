import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { validateApiKey } from "@/lib/sentinel/api-auth";
import { getUserSentinelTier } from "@/lib/sentinel/feature-gating";
import {
  getEntity,
  getEntityNetwork,
  getEntityEvents,
} from "@/lib/sentinel/event-graph";
import { db } from "@/lib/db";
import type { SentinelTier } from "@/lib/sentinel/types";

// ---- Auth Helper ----

async function authenticateExpert(req: NextRequest): Promise<
  | { userId: string; tier: SentinelTier }
  | NextResponse
> {
  const authHeader = req.headers.get("authorization");

  if (authHeader?.includes("stl_")) {
    const validation = await validateApiKey(authHeader);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 401 });
    }
    const tier = validation.tier!;
    if (tier !== "EXPERT" && tier !== "STRATEGIC") {
      return NextResponse.json(
        { error: "Event Graph requires EXPERT tier or above" },
        { status: 403 }
      );
    }
    return { userId: validation.userId!, tier };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getUserSentinelTier(session.user.id);
  if (tier !== "EXPERT" && tier !== "STRATEGIC") {
    return NextResponse.json(
      { error: "Event Graph requires EXPERT tier or above" },
      { status: 403 }
    );
  }

  return { userId: session.user.id, tier };
}

// ---- Schemas ----

const ENTITY_TYPES = [
  "PERSON",
  "ORGANIZATION",
  "COUNTRY",
  "CITY",
  "INFRASTRUCTURE",
  "ROUTE",
  "SECTOR",
  "COMMODITY",
  "WEAPON_SYSTEM",
] as const;

const updateEntitySchema = z.object({
  countryCode: z.string().length(2).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  aliases: z.array(z.string()).max(20).optional(),
});

// ---- GET: Entity details, network, or events ----

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateExpert(req);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const depthParam = searchParams.get("depth");
    const showEvents = searchParams.get("events") === "true";

    // Network view
    if (depthParam) {
      const depth = Math.min(3, Math.max(1, Number(depthParam) || 2));
      const network = await getEntityNetwork(id, depth);
      return NextResponse.json({ data: network });
    }

    // Entity details
    const entity = await getEntity(id);
    if (!entity) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    // Optionally include paginated events
    let events = null;
    if (showEvents) {
      const page = Math.max(1, Number(searchParams.get("page")) || 1);
      events = await getEntityEvents(id, page, 20);
    }

    return NextResponse.json({
      data: {
        entity,
        events: events?.data ?? undefined,
        eventsPagination: events?.pagination ?? undefined,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("[Sentinel Graph] GET [id] error:", error);

    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ---- PATCH: Update entity metadata/aliases ----

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateExpert(req);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const body = await req.json();

    const parsed = updateEntitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Check entity exists
    const existing = await db.graphEntity.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.countryCode !== undefined) {
      updateData.countryCode = parsed.data.countryCode.toUpperCase();
    }
    if (parsed.data.metadata !== undefined) {
      updateData.metadata = parsed.data.metadata;
    }
    if (parsed.data.aliases !== undefined) {
      updateData.aliases = parsed.data.aliases;
    }

    const updated = await db.graphEntity.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[Sentinel Graph] PATCH [id] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
