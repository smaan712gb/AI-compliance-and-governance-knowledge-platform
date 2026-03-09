// ============================================
// SENTINEL — Watchlists & Customer Intelligence
// "Show me risks to MY suppliers, countries, keywords"
// ============================================

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type WatchlistType = "COUNTRY" | "ENTITY" | "KEYWORD" | "SUPPLIER" | "SECTOR" | "ROUTE";

export interface WatchlistItem {
  value: string;       // e.g., "UA", "Huawei", "nuclear", "TSMC"
  label?: string;      // Human-readable label
  metadata?: Record<string, unknown>;
}

export interface WatchlistWithMatches {
  id: string;
  name: string;
  type: WatchlistType;
  items: WatchlistItem[];
  isActive: boolean;
  matchCount: number;
  unreadCount: number;
  lastMatchAt: Date | null;
}

const MAX_ITEMS_PER_WATCHLIST = 50;

// ---- Create ----

export async function createWatchlist(
  userId: string,
  name: string,
  type: WatchlistType,
  items: WatchlistItem[],
  description?: string,
  alertOnMatch = true
) {
  if (!name.trim()) {
    throw new Error("Watchlist name is required");
  }

  if (items.length === 0) {
    throw new Error("At least one watchlist item is required");
  }

  if (items.length > MAX_ITEMS_PER_WATCHLIST) {
    throw new Error(`Maximum ${MAX_ITEMS_PER_WATCHLIST} items per watchlist`);
  }

  // Deduplicate items by value
  const seen = new Set<string>();
  const uniqueItems = items.filter((item) => {
    const key = item.value.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const watchlist = await db.sentinelWatchlist.create({
    data: {
      userId,
      name: name.trim(),
      type,
      items: uniqueItems as unknown as Prisma.InputJsonValue,
      description: description?.trim() || null,
      alertOnMatch,
    },
  });

  return watchlist;
}

// ---- Update ----

export async function updateWatchlist(
  id: string,
  userId: string,
  updates: {
    name?: string;
    items?: WatchlistItem[];
    isActive?: boolean;
    alertOnMatch?: boolean;
    description?: string;
  }
) {
  const existing = await db.sentinelWatchlist.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!existing) {
    throw new Error("Watchlist not found");
  }

  if (existing.userId !== userId) {
    throw new Error("Access denied");
  }

  if (updates.items) {
    if (updates.items.length === 0) {
      throw new Error("At least one watchlist item is required");
    }
    if (updates.items.length > MAX_ITEMS_PER_WATCHLIST) {
      throw new Error(`Maximum ${MAX_ITEMS_PER_WATCHLIST} items per watchlist`);
    }
  }

  const data: Record<string, unknown> = {};
  if (updates.name !== undefined) data.name = updates.name.trim();
  if (updates.items !== undefined) data.items = updates.items as unknown as Prisma.InputJsonValue;
  if (updates.isActive !== undefined) data.isActive = updates.isActive;
  if (updates.alertOnMatch !== undefined) data.alertOnMatch = updates.alertOnMatch;
  if (updates.description !== undefined) data.description = updates.description?.trim() || null;

  return db.sentinelWatchlist.update({
    where: { id },
    data,
  });
}

// ---- Delete (soft) ----

export async function deleteWatchlist(id: string, userId: string) {
  const existing = await db.sentinelWatchlist.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!existing) {
    throw new Error("Watchlist not found");
  }

  if (existing.userId !== userId) {
    throw new Error("Access denied");
  }

  return db.sentinelWatchlist.update({
    where: { id },
    data: { isActive: false },
  });
}

// ---- Get user watchlists with match counts ----

export async function getUserWatchlists(userId: string): Promise<WatchlistWithMatches[]> {
  const watchlists = await db.sentinelWatchlist.findMany({
    where: { userId, isActive: true },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { matches: true },
      },
      matches: {
        where: { isRead: false },
        select: { id: true },
      },
    },
  });

  // Fetch last match timestamps in a single query
  const lastMatches = await db.watchlistMatch.groupBy({
    by: ["watchlistId"],
    where: {
      watchlistId: { in: watchlists.map((w) => w.id) },
    },
    _max: { createdAt: true },
  });

  const lastMatchMap = new Map(
    lastMatches.map((m) => [m.watchlistId, m._max.createdAt])
  );

  return watchlists.map((w) => ({
    id: w.id,
    name: w.name,
    type: w.type as WatchlistType,
    items: (w.items as unknown as WatchlistItem[]) || [],
    isActive: w.isActive,
    matchCount: w._count.matches,
    unreadCount: w.matches.length,
    lastMatchAt: lastMatchMap.get(w.id) || null,
  }));
}

// ---- Get matches for a watchlist (paginated) ----

export async function getWatchlistMatches(
  watchlistId: string,
  userId: string,
  page = 1,
  limit = 20
) {
  const watchlist = await db.sentinelWatchlist.findUnique({
    where: { id: watchlistId },
    select: { userId: true, name: true, type: true, items: true, isActive: true },
  });

  if (!watchlist) {
    throw new Error("Watchlist not found");
  }

  if (watchlist.userId !== userId) {
    throw new Error("Access denied");
  }

  const skip = (page - 1) * limit;

  const [matches, total] = await Promise.all([
    db.watchlistMatch.findMany({
      where: { watchlistId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        event: {
          select: {
            id: true,
            headline: true,
            summary: true,
            severity: true,
            category: true,
            countryCode: true,
            countryName: true,
            riskScore: true,
            processedAt: true,
          },
        },
      },
    }),
    db.watchlistMatch.count({ where: { watchlistId } }),
  ]);

  return {
    watchlist: {
      id: watchlistId,
      name: watchlist.name,
      type: watchlist.type,
      items: watchlist.items,
      isActive: watchlist.isActive,
    },
    matches,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + limit < total,
    },
  };
}

// ---- Mark matches read ----

export async function markMatchesRead(watchlistId: string, userId: string) {
  const watchlist = await db.sentinelWatchlist.findUnique({
    where: { id: watchlistId },
    select: { userId: true },
  });

  if (!watchlist) {
    throw new Error("Watchlist not found");
  }

  if (watchlist.userId !== userId) {
    throw new Error("Access denied");
  }

  const result = await db.watchlistMatch.updateMany({
    where: { watchlistId, isRead: false },
    data: { isRead: true },
  });

  return { updated: result.count };
}

// ---- Check event against all active watchlists ----

export async function checkEventAgainstWatchlists(event: {
  id: string;
  headline: string;
  summary: string;
  countryCode?: string | null;
  category: string;
  entities: string[];
  tags: string[];
}) {
  const watchlists = await db.sentinelWatchlist.findMany({
    where: { isActive: true },
    select: { id: true, type: true, items: true },
  });

  if (watchlists.length === 0) return { matchesCreated: 0 };

  const headlineLower = event.headline.toLowerCase();
  const summaryLower = event.summary.toLowerCase();
  const entitiesLower = event.entities.map((e) => e.toLowerCase());
  const tagsLower = event.tags.map((t) => t.toLowerCase());
  const countryUpper = event.countryCode?.toUpperCase() || "";
  const categoryUpper = event.category.toUpperCase();

  const matchRecords: {
    watchlistId: string;
    eventId: string;
    matchedItem: string;
    matchScore: number;
  }[] = [];

  for (const watchlist of watchlists) {
    const items = (watchlist.items as unknown as WatchlistItem[]) || [];

    for (const item of items) {
      const val = item.value.trim();
      if (!val) continue;

      let matched = false;
      let score = 1.0;

      switch (watchlist.type) {
        case "COUNTRY":
          matched = countryUpper === val.toUpperCase();
          break;

        case "ENTITY":
        case "SUPPLIER": {
          const valLower = val.toLowerCase();
          if (entitiesLower.some((e) => e.includes(valLower))) {
            matched = true;
          } else if (headlineLower.includes(valLower)) {
            matched = true;
            score = 0.9;
          } else if (summaryLower.includes(valLower)) {
            matched = true;
            score = 0.7;
          }
          break;
        }

        case "KEYWORD": {
          const valLower = val.toLowerCase();
          if (headlineLower.includes(valLower)) {
            matched = true;
          } else if (summaryLower.includes(valLower)) {
            matched = true;
            score = 0.8;
          }
          break;
        }

        case "SECTOR": {
          const valLower = val.toLowerCase();
          if (categoryUpper === val.toUpperCase()) {
            matched = true;
          } else if (tagsLower.some((t) => t.includes(valLower))) {
            matched = true;
            score = 0.8;
          }
          break;
        }

        case "ROUTE": {
          const valLower = val.toLowerCase();
          if (tagsLower.some((t) => t.includes(valLower))) {
            matched = true;
          } else if (summaryLower.includes(valLower)) {
            matched = true;
            score = 0.7;
          }
          break;
        }
      }

      if (matched) {
        matchRecords.push({
          watchlistId: watchlist.id,
          eventId: event.id,
          matchedItem: val,
          matchScore: score,
        });
      }
    }
  }

  if (matchRecords.length === 0) return { matchesCreated: 0 };

  // Deduplicate: one match per watchlist-event pair (keep highest score)
  const deduped = new Map<string, (typeof matchRecords)[number]>();
  for (const record of matchRecords) {
    const key = `${record.watchlistId}:${record.eventId}`;
    const existing = deduped.get(key);
    if (!existing || record.matchScore > existing.matchScore) {
      deduped.set(key, record);
    }
  }

  // Skip any that already exist in the DB
  const existingMatches = await db.watchlistMatch.findMany({
    where: {
      eventId: event.id,
      watchlistId: { in: [...deduped.values()].map((r) => r.watchlistId) },
    },
    select: { watchlistId: true, eventId: true },
  });

  const existingKeys = new Set(
    existingMatches.map((m) => `${m.watchlistId}:${m.eventId}`)
  );

  const toCreate = [...deduped.values()].filter(
    (r) => !existingKeys.has(`${r.watchlistId}:${r.eventId}`)
  );

  if (toCreate.length === 0) return { matchesCreated: 0 };

  const result = await db.watchlistMatch.createMany({ data: toCreate });

  return { matchesCreated: result.count };
}
