// ============================================
// SENTINEL — Event Graph / Ontology
// Structured relationships: actor → region → infra → company → sector → consequence
// ============================================

import { db } from "@/lib/db";
import type { EntityType, RelationType } from "@prisma/client";

export type { EntityType, RelationType };

export type EntityRole = "actor" | "target" | "location" | "affected";

// ---- Types ----

export interface CreateEntityParams {
  name: string;
  type: EntityType;
  countryCode?: string;
  metadata?: Record<string, unknown>;
  aliases?: string[];
}

export interface CreateRelationParams {
  fromId: string;
  toId: string;
  type: RelationType;
  weight?: number;
  confidence?: number;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface EntityLink {
  entityId: string;
  role: EntityRole;
}

export interface GraphNetwork {
  nodes: Array<{
    id: string;
    name: string;
    type: EntityType;
    countryCode: string | null;
    aliases: string[];
  }>;
  edges: Array<{
    id: string;
    fromId: string;
    toId: string;
    type: RelationType;
    weight: number;
    confidence: number;
    source: string | null;
  }>;
}

// ---- Infrastructure Keywords ----

const INFRASTRUCTURE_KEYWORDS = [
  "port",
  "pipeline",
  "strait",
  "canal",
  "airport",
  "refinery",
  "bridge",
  "dam",
  "powerplant",
  "power plant",
  "nuclear plant",
  "terminal",
  "harbor",
  "harbour",
  "base",
  "airfield",
  "railway",
  "highway",
];

// ---- 1. Create Entity (Upsert) ----

export async function createEntity(params: CreateEntityParams) {
  const { name, type, countryCode, metadata, aliases } = params;

  const entity = await db.graphEntity.upsert({
    where: {
      name_type: { name: name.trim(), type },
    },
    create: {
      name: name.trim(),
      type,
      countryCode: countryCode?.toUpperCase() || null,
      metadata: metadata ? (metadata as Record<string, string>) : undefined,
      aliases: aliases ?? [],
    },
    update: {
      countryCode: countryCode?.toUpperCase() || undefined,
      metadata: metadata ? (metadata as Record<string, string>) : undefined,
      aliases: aliases ?? undefined,
      updatedAt: new Date(),
    },
  });

  return entity;
}

// ---- 2. Create Relation ----

export async function createRelation(params: CreateRelationParams) {
  const { fromId, toId, type, weight, confidence, source, metadata } = params;

  // Prevent self-referential relations
  if (fromId === toId) {
    throw new Error("Self-referential relations are not allowed");
  }

  // Verify both entities exist
  const [from, to] = await Promise.all([
    db.graphEntity.findUnique({ where: { id: fromId }, select: { id: true } }),
    db.graphEntity.findUnique({ where: { id: toId }, select: { id: true } }),
  ]);

  if (!from) throw new Error(`Entity not found: ${fromId}`);
  if (!to) throw new Error(`Entity not found: ${toId}`);

  const relation = await db.graphRelation.create({
    data: {
      fromId,
      toId,
      type,
      weight: weight ?? 1.0,
      confidence: confidence ?? 0.8,
      source: source ?? null,
      metadata: metadata ? (metadata as Record<string, string>) : undefined,
    },
    include: {
      from: { select: { id: true, name: true, type: true } },
      to: { select: { id: true, name: true, type: true } },
    },
  });

  return relation;
}

// ---- 3. Get Entity ----

export async function getEntity(id: string) {
  const entity = await db.graphEntity.findUnique({
    where: { id },
    include: {
      outgoingRelations: {
        include: {
          to: { select: { id: true, name: true, type: true, countryCode: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      incomingRelations: {
        include: {
          from: { select: { id: true, name: true, type: true, countryCode: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      eventLinks: {
        include: {
          event: {
            select: {
              id: true,
              headline: true,
              severity: true,
              category: true,
              countryCode: true,
              processedAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  return entity;
}

// ---- 4. Search Entities ----

export async function searchEntities(query: string, type?: EntityType) {
  const where: Record<string, unknown> = {
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { aliases: { has: query } },
    ],
  };

  if (type) {
    where.type = type;
  }

  const entities = await db.graphEntity.findMany({
    where,
    select: {
      id: true,
      name: true,
      type: true,
      countryCode: true,
      aliases: true,
      createdAt: true,
      _count: {
        select: {
          outgoingRelations: true,
          incomingRelations: true,
          eventLinks: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return entities;
}

// ---- 5. Get Entity Relations ----

export async function getEntityRelations(
  entityId: string,
  direction: "outgoing" | "incoming" | "both" = "both",
  relationType?: RelationType
) {
  const results: { outgoing: unknown[]; incoming: unknown[] } = {
    outgoing: [],
    incoming: [],
  };

  const typeFilter = relationType ? { type: relationType } : {};

  if (direction === "outgoing" || direction === "both") {
    results.outgoing = await db.graphRelation.findMany({
      where: { fromId: entityId, ...typeFilter },
      include: {
        to: { select: { id: true, name: true, type: true, countryCode: true } },
      },
      orderBy: { weight: "desc" },
    });
  }

  if (direction === "incoming" || direction === "both") {
    results.incoming = await db.graphRelation.findMany({
      where: { toId: entityId, ...typeFilter },
      include: {
        from: { select: { id: true, name: true, type: true, countryCode: true } },
      },
      orderBy: { weight: "desc" },
    });
  }

  return results;
}

// ---- 6. Get Entity Network (BFS) ----

export async function getEntityNetwork(
  entityId: string,
  depth: number = 2
): Promise<GraphNetwork> {
  const maxDepth = Math.min(depth, 3);
  const nodeMap = new Map<string, GraphNetwork["nodes"][0]>();
  const edgeMap = new Map<string, GraphNetwork["edges"][0]>();
  const visited = new Set<string>();
  const queue: Array<{ id: string; level: number }> = [{ id: entityId, level: 0 }];

  // Seed with root entity
  const root = await db.graphEntity.findUnique({
    where: { id: entityId },
    select: { id: true, name: true, type: true, countryCode: true, aliases: true },
  });

  if (!root) throw new Error(`Entity not found: ${entityId}`);
  nodeMap.set(root.id, root);

  while (queue.length > 0 && nodeMap.size < 100) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);

    if (current.level >= maxDepth) continue;

    // Fetch all relations for current node
    const [outgoing, incoming] = await Promise.all([
      db.graphRelation.findMany({
        where: { fromId: current.id },
        select: {
          id: true,
          fromId: true,
          toId: true,
          type: true,
          weight: true,
          confidence: true,
          source: true,
          to: { select: { id: true, name: true, type: true, countryCode: true, aliases: true } },
        },
        take: 20,
      }),
      db.graphRelation.findMany({
        where: { toId: current.id },
        select: {
          id: true,
          fromId: true,
          toId: true,
          type: true,
          weight: true,
          confidence: true,
          source: true,
          from: { select: { id: true, name: true, type: true, countryCode: true, aliases: true } },
        },
        take: 20,
      }),
    ]);

    for (const rel of outgoing) {
      if (nodeMap.size >= 100) break;
      edgeMap.set(rel.id, {
        id: rel.id,
        fromId: rel.fromId,
        toId: rel.toId,
        type: rel.type,
        weight: rel.weight,
        confidence: rel.confidence,
        source: rel.source,
      });
      if (!nodeMap.has(rel.to.id)) {
        nodeMap.set(rel.to.id, rel.to);
        queue.push({ id: rel.to.id, level: current.level + 1 });
      }
    }

    for (const rel of incoming) {
      if (nodeMap.size >= 100) break;
      edgeMap.set(rel.id, {
        id: rel.id,
        fromId: rel.fromId,
        toId: rel.toId,
        type: rel.type,
        weight: rel.weight,
        confidence: rel.confidence,
        source: rel.source,
      });
      if (!nodeMap.has(rel.from.id)) {
        nodeMap.set(rel.from.id, rel.from);
        queue.push({ id: rel.from.id, level: current.level + 1 });
      }
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  };
}

// ---- 7. Link Event to Entities ----

export async function linkEventToEntities(eventId: string, entityLinks: EntityLink[]) {
  // Verify event exists
  const event = await db.intelligenceEvent.findUnique({
    where: { id: eventId },
    select: { id: true },
  });
  if (!event) throw new Error(`Event not found: ${eventId}`);

  const results = await db.$transaction(
    entityLinks.map((link) =>
      db.eventEntityLink.upsert({
        where: {
          eventId_entityId_role: {
            eventId,
            entityId: link.entityId,
            role: link.role,
          },
        },
        create: {
          eventId,
          entityId: link.entityId,
          role: link.role,
        },
        update: {},
        include: {
          entity: { select: { id: true, name: true, type: true } },
        },
      })
    )
  );

  return results;
}

// ---- 8. Get Event Entities ----

export async function getEventEntities(eventId: string) {
  const links = await db.eventEntityLink.findMany({
    where: { eventId },
    include: {
      entity: {
        select: {
          id: true,
          name: true,
          type: true,
          countryCode: true,
          aliases: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return links;
}

// ---- 9. Get Entity Events (Paginated) ----

export async function getEntityEvents(
  entityId: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;

  const [links, total] = await Promise.all([
    db.eventEntityLink.findMany({
      where: { entityId },
      include: {
        event: {
          select: {
            id: true,
            headline: true,
            summary: true,
            category: true,
            severity: true,
            countryCode: true,
            riskScore: true,
            processedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.eventEntityLink.count({ where: { entityId } }),
  ]);

  return {
    data: links,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ---- 10. Auto-Extract and Link ----

export async function autoExtractAndLink(
  eventId: string,
  headline: string,
  summary: string,
  countryCode?: string
) {
  const entityLinks: EntityLink[] = [];
  const text = `${headline} ${summary}`;

  // Country code → COUNTRY entity
  if (countryCode) {
    const countryEntity = await createEntity({
      name: countryCode.toUpperCase(),
      type: "COUNTRY",
      countryCode: countryCode.toUpperCase(),
    });
    entityLinks.push({ entityId: countryEntity.id, role: "location" });
  }

  // Extract capitalized multi-word phrases (potential PERSON or ORGANIZATION)
  const phraseRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
  const phrases = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = phraseRegex.exec(text)) !== null) {
    const phrase = match[1].trim();
    // Skip very short or very long phrases
    if (phrase.length >= 4 && phrase.length <= 80) {
      phrases.add(phrase);
    }
  }

  // Common title words suggest a PERSON
  const personIndicators = [
    "President",
    "Minister",
    "General",
    "Admiral",
    "Dr",
    "Senator",
    "Governor",
    "Ambassador",
    "Secretary",
    "Commander",
    "Chairman",
    "Director",
    "Chief",
  ];

  // Org indicators
  const orgIndicators = [
    "Corporation",
    "Corp",
    "Inc",
    "Ltd",
    "Group",
    "Authority",
    "Agency",
    "Ministry",
    "Department",
    "Council",
    "Commission",
    "Institute",
    "Foundation",
    "Alliance",
    "Union",
    "Organization",
    "Organisation",
    "Bank",
    "Fund",
    "Company",
  ];

  for (const phrase of phrases) {
    const words = phrase.split(/\s+/);
    const isPerson = words.some((w) =>
      personIndicators.some((p) => w.startsWith(p))
    );
    const isOrg = words.some((w) =>
      orgIndicators.some((o) => w.startsWith(o))
    );

    const entityType: EntityType = isPerson
      ? "PERSON"
      : isOrg
        ? "ORGANIZATION"
        : words.length <= 3
          ? "PERSON"
          : "ORGANIZATION";

    const entity = await createEntity({
      name: phrase,
      type: entityType,
      countryCode: countryCode?.toUpperCase(),
    });

    entityLinks.push({
      entityId: entity.id,
      role: isPerson ? "actor" : "affected",
    });
  }

  // Extract infrastructure mentions
  const lowerText = text.toLowerCase();
  for (const keyword of INFRASTRUCTURE_KEYWORDS) {
    const idx = lowerText.indexOf(keyword);
    if (idx === -1) continue;

    // Try to extract the full infrastructure name (look for capitalized words before the keyword)
    const beforeText = text.substring(Math.max(0, idx - 40), idx).trim();
    const capWords = beforeText.match(/(?:[A-Z][a-z]+\s*)+$/);
    const infraName = capWords
      ? `${capWords[0].trim()} ${text.substring(idx, idx + keyword.length)}`
      : text.substring(idx, idx + keyword.length);

    if (infraName.length >= 3) {
      const entity = await createEntity({
        name: infraName.charAt(0).toUpperCase() + infraName.slice(1),
        type: "INFRASTRUCTURE",
        countryCode: countryCode?.toUpperCase(),
      });
      entityLinks.push({ entityId: entity.id, role: "target" });
    }
  }

  // Link all extracted entities to the event
  if (entityLinks.length > 0) {
    await linkEventToEntities(eventId, entityLinks);
  }

  return entityLinks;
}

// ---- 11. Graph Stats ----

export async function getGraphStats() {
  const [
    entityCounts,
    relationCounts,
    totalEventLinks,
  ] = await Promise.all([
    db.graphEntity.groupBy({
      by: ["type"],
      _count: { id: true },
    }),
    db.graphRelation.groupBy({
      by: ["type"],
      _count: { id: true },
    }),
    db.eventEntityLink.count(),
  ]);

  const entitiesByType: Record<string, number> = {};
  let totalEntities = 0;
  for (const row of entityCounts) {
    entitiesByType[row.type] = row._count.id;
    totalEntities += row._count.id;
  }

  const relationsByType: Record<string, number> = {};
  let totalRelations = 0;
  for (const row of relationCounts) {
    relationsByType[row.type] = row._count.id;
    totalRelations += row._count.id;
  }

  return {
    totalEntities,
    totalRelations,
    totalEventLinks,
    entitiesByType,
    relationsByType,
  };
}
