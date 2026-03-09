// ============================================
// SENTINEL — Workflow Engine
// Case management, analyst notes, briefings
// ============================================

import { db } from "@/lib/db";

export type CaseStatus = "OPEN" | "IN_PROGRESS" | "PENDING_REVIEW" | "ESCALATED" | "RESOLVED" | "CLOSED";
export type CasePriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface CaseFilters {
  status?: CaseStatus;
  priority?: CasePriority;
  assigneeId?: string;
  page?: number;
  limit?: number;
}

// ---- Cases ----

export async function createCase(params: {
  title: string;
  description?: string;
  priority: CasePriority;
  createdById: string;
  assigneeId?: string;
  eventIds?: string[];
  tags?: string[];
  dueDate?: Date;
}) {
  return db.sentinelCase.create({
    data: {
      title: params.title,
      description: params.description || null,
      priority: params.priority,
      createdById: params.createdById,
      assigneeId: params.assigneeId || null,
      eventIds: params.eventIds || [],
      tags: params.tags || [],
      dueDate: params.dueDate || null,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function updateCase(
  id: string,
  userId: string,
  updates: {
    status?: CaseStatus;
    priority?: CasePriority;
    assigneeId?: string | null;
    tags?: string[];
    dueDate?: Date | null;
  }
) {
  // Verify access
  const existing = await db.sentinelCase.findUnique({
    where: { id },
    select: { createdById: true, assigneeId: true },
  });
  if (!existing) throw new Error("Case not found");
  if (existing.createdById !== userId && existing.assigneeId !== userId) {
    throw new Error("Access denied");
  }

  const data: Record<string, unknown> = { ...updates };

  // Set resolvedAt when transitioning to RESOLVED
  if (updates.status === "RESOLVED") {
    data.resolvedAt = new Date();
  }

  return db.sentinelCase.update({
    where: { id },
    data,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      _count: { select: { notes: true } },
    },
  });
}

export async function getCases(userId: string, filters?: CaseFilters) {
  const page = filters?.page ?? 1;
  const limit = Math.min(filters?.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    OR: [{ createdById: userId }, { assigneeId: userId }],
  };
  if (filters?.status) where.status = filters.status;
  if (filters?.priority) where.priority = filters.priority;

  const [cases, total] = await Promise.all([
    db.sentinelCase.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        _count: { select: { notes: true } },
      },
    }),
    db.sentinelCase.count({ where }),
  ]);

  return {
    data: cases,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getCaseById(id: string, userId: string) {
  const c = await db.sentinelCase.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      notes: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  if (!c) throw new Error("Case not found");
  if (c.createdById !== userId && c.assigneeId !== userId) {
    throw new Error("Access denied");
  }

  // Fetch related event headlines
  let relatedEvents: { id: string; headline: string; severity: string; category: string; countryCode: string | null }[] = [];
  if (c.eventIds.length > 0) {
    relatedEvents = await db.intelligenceEvent.findMany({
      where: { id: { in: c.eventIds } },
      select: { id: true, headline: true, severity: true, category: true, countryCode: true },
    });
  }

  return { ...c, relatedEvents };
}

// ---- Notes ----

export async function addNote(
  caseId: string,
  userId: string,
  content: string,
  isInternal = false
) {
  // Verify case access
  const c = await db.sentinelCase.findUnique({
    where: { id: caseId },
    select: { createdById: true, assigneeId: true },
  });
  if (!c) throw new Error("Case not found");
  if (c.createdById !== userId && c.assigneeId !== userId) {
    throw new Error("Access denied");
  }

  return db.sentinelCaseNote.create({
    data: { caseId, userId, content, isInternal },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

export async function getCaseNotes(caseId: string, userId: string) {
  const c = await db.sentinelCase.findUnique({
    where: { id: caseId },
    select: { createdById: true, assigneeId: true },
  });
  if (!c) throw new Error("Case not found");
  if (c.createdById !== userId && c.assigneeId !== userId) {
    throw new Error("Access denied");
  }

  return db.sentinelCaseNote.findMany({
    where: { caseId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

// ---- Briefings ----

export async function createBriefing(params: {
  userId: string;
  title: string;
  eventIds: string[];
  format?: string;
}) {
  const format = params.format || "markdown";

  // Fetch events
  const events = await db.intelligenceEvent.findMany({
    where: { id: { in: params.eventIds } },
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
  });

  if (events.length === 0) {
    throw new Error("No valid events found for briefing");
  }

  // Compose markdown briefing
  const now = new Date().toISOString().split("T")[0];
  const lines: string[] = [
    `# ${params.title}`,
    "",
    `**Generated:** ${now} | **Events:** ${events.length}`,
    "",
    "---",
    "",
    "## Executive Summary",
    "",
    `This briefing covers ${events.length} intelligence event(s) across ` +
      `${new Set(events.map((e) => e.category)).size} categories. ` +
      `Highest severity: **${getMaxSeverity(events.map((e) => e.severity))}**. ` +
      `Average risk score: **${Math.round(events.reduce((s, e) => s + e.riskScore, 0) / events.length)}**.`,
    "",
    "---",
    "",
    "## Event Details",
    "",
  ];

  for (const evt of events) {
    lines.push(
      `### ${evt.headline}`,
      "",
      `- **Severity:** ${evt.severity} | **Category:** ${evt.category} | **Country:** ${evt.countryName || evt.countryCode || "N/A"}`,
      `- **Risk Score:** ${evt.riskScore} | **Processed:** ${evt.processedAt.toISOString().split("T")[0]}`,
      "",
      evt.summary.length > 500 ? evt.summary.slice(0, 500) + "..." : evt.summary,
      "",
    );
  }

  lines.push(
    "---",
    "",
    "## Risk Assessment",
    "",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Events | ${events.length} |`,
    `| Critical/High | ${events.filter((e) => ["SENTINEL_CRITICAL", "SENTINEL_HIGH"].includes(e.severity)).length} |`,
    `| Countries Affected | ${new Set(events.map((e) => e.countryCode).filter(Boolean)).size} |`,
    `| Avg Risk Score | ${Math.round(events.reduce((s, e) => s + e.riskScore, 0) / events.length)} |`,
    "",
    "---",
    "",
    "## Recommendations",
    "",
    "- [ ] Review critical-severity events and escalate as needed",
    "- [ ] Monitor affected regions for developments",
    "- [ ] Update risk assessments for impacted operations",
    "- [ ] Brief relevant stakeholders on key findings",
    "",
  );

  const content = lines.join("\n");

  return db.sentinelBriefing.create({
    data: {
      userId: params.userId,
      title: params.title,
      content,
      eventIds: params.eventIds,
      format,
    },
  });
}

function getMaxSeverity(severities: string[]): string {
  const order = ["SENTINEL_CRITICAL", "SENTINEL_HIGH", "SENTINEL_MEDIUM", "SENTINEL_LOW", "INFO"];
  for (const s of order) {
    if (severities.includes(s)) return s.replace("SENTINEL_", "").toLowerCase();
  }
  return "unknown";
}

export async function getUserBriefings(userId: string, page = 1, limit = 20) {
  limit = Math.min(limit, 100);
  const skip = (page - 1) * limit;

  const [briefings, total] = await Promise.all([
    db.sentinelBriefing.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    db.sentinelBriefing.count({ where: { userId } }),
  ]);

  return {
    data: briefings,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getBriefingById(id: string, userId: string) {
  const b = await db.sentinelBriefing.findUnique({ where: { id } });
  if (!b) throw new Error("Briefing not found");
  if (b.userId !== userId) throw new Error("Access denied");
  return b;
}

// ---- Stats ----

export async function getCaseStats(userId: string) {
  const where = {
    OR: [{ createdById: userId }, { assigneeId: userId }],
  };

  const [total, byStatus, byPriority, resolved] = await Promise.all([
    db.sentinelCase.count({ where }),
    db.sentinelCase.groupBy({
      by: ["status"],
      where,
      _count: { id: true },
    }),
    db.sentinelCase.groupBy({
      by: ["priority"],
      where,
      _count: { id: true },
    }),
    db.sentinelCase.findMany({
      where: { ...where, resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
    }),
  ]);

  // Avg resolution time in hours
  let avgResolutionHours = 0;
  if (resolved.length > 0) {
    const totalMs = resolved.reduce((sum, c) => {
      return sum + (c.resolvedAt!.getTime() - c.createdAt.getTime());
    }, 0);
    avgResolutionHours = Math.round(totalMs / resolved.length / 3600000);
  }

  const statusMap: Record<string, number> = {};
  byStatus.forEach((s) => { statusMap[s.status] = s._count.id; });

  const priorityMap: Record<string, number> = {};
  byPriority.forEach((p) => { priorityMap[p.priority] = p._count.id; });

  return {
    total,
    byStatus: statusMap,
    byPriority: priorityMap,
    avgResolutionHours,
  };
}
