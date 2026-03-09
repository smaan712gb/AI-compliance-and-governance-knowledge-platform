import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { validateApiKey } from "@/lib/sentinel/api-auth";
import { getUserSentinelTier } from "@/lib/sentinel/feature-gating";
import {
  searchEntities,
  getGraphStats,
  createEntity,
  createRelation,
  linkEventToEntities,
} from "@/lib/sentinel/event-graph";
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

const RELATION_TYPES = [
  "OPERATES_IN",
  "ALLY_OF",
  "RIVAL_OF",
  "SUPPLIES",
  "SANCTIONS",
  "CONTROLS",
  "TRADES",
  "LOCATED_IN",
  "LEADS",
  "MEMBER_OF",
  "CAUSED_BY",
  "AFFECTS",
] as const;

const createEntitySchema = z.object({
  action: z.literal("create_entity"),
  name: z.string().min(1).max(200),
  type: z.enum(ENTITY_TYPES),
  countryCode: z.string().length(2).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  aliases: z.array(z.string()).max(20).optional(),
});

const createRelationSchema = z.object({
  action: z.literal("create_relation"),
  fromId: z.string().min(1),
  toId: z.string().min(1),
  type: z.enum(RELATION_TYPES),
  weight: z.number().min(0).max(10).optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const linkEventSchema = z.object({
  action: z.literal("link_event"),
  eventId: z.string().min(1),
  entityLinks: z.array(
    z.object({
      entityId: z.string().min(1),
      role: z.enum(["actor", "target", "location", "affected"]),
    })
  ).min(1).max(50),
});

// ---- GET: Search entities or get stats ----

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateExpert(req);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");

    // Stats view
    if (view === "stats") {
      const stats = await getGraphStats();
      return NextResponse.json({ data: stats });
    }

    // Search view
    const query = searchParams.get("q");
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Search query 'q' is required (or use ?view=stats)" },
        { status: 400 }
      );
    }

    const typeFilter = searchParams.get("type") as typeof ENTITY_TYPES[number] | null;
    if (typeFilter && !ENTITY_TYPES.includes(typeFilter as typeof ENTITY_TYPES[number])) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${ENTITY_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const entities = await searchEntities(query.trim(), typeFilter || undefined);
    return NextResponse.json({ data: entities });
  } catch (error) {
    console.error("[Sentinel Graph] GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ---- POST: Create entity, relation, or link event ----

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateExpert(req);
    if (authResult instanceof NextResponse) return authResult;

    const body = await req.json();
    const action = body?.action;

    if (action === "create_entity") {
      const parsed = createEntitySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.issues },
          { status: 400 }
        );
      }

      const entity = await createEntity({
        name: parsed.data.name,
        type: parsed.data.type,
        countryCode: parsed.data.countryCode,
        metadata: parsed.data.metadata,
        aliases: parsed.data.aliases,
      });

      return NextResponse.json({ data: entity }, { status: 201 });
    }

    if (action === "create_relation") {
      const parsed = createRelationSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.issues },
          { status: 400 }
        );
      }

      const relation = await createRelation({
        fromId: parsed.data.fromId,
        toId: parsed.data.toId,
        type: parsed.data.type,
        weight: parsed.data.weight,
        confidence: parsed.data.confidence,
        source: parsed.data.source,
        metadata: parsed.data.metadata,
      });

      return NextResponse.json({ data: relation }, { status: 201 });
    }

    if (action === "link_event") {
      const parsed = linkEventSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.issues },
          { status: 400 }
        );
      }

      const links = await linkEventToEntities(
        parsed.data.eventId,
        parsed.data.entityLinks
      );

      return NextResponse.json({ data: links }, { status: 201 });
    }

    return NextResponse.json(
      { error: "Invalid action. Must be: create_entity, create_relation, or link_event" },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("[Sentinel Graph] POST error:", error);

    if (message.includes("not found") || message.includes("not allowed")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
