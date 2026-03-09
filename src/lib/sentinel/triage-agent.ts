// ============================================
// SENTINEL — Autonomous Alert Triage Agent
// Triggered on high-severity events during ingestion
// Orchestrates: screening → scoring → briefing → case → notify
// ============================================

import { db } from "@/lib/db";
import type { TriageStatus } from "@prisma/client";
import { screenEntity } from "./sanctions-screener";
import { calculateCrisisScore } from "./crisis-index";
import { checkEventAgainstWatchlists } from "./watchlists";
import { createCase, createBriefing } from "./workflow";
import { broadcastAlert, buildIntelligenceAlert } from "./webhook-alerts";
import type { ComprehensiveScreeningResult } from "./types";

export interface TriageResult {
  runId: string;
  stagesCompleted: string[];
  screeningResults: ComprehensiveScreeningResult[];
  crisisScore: number | null;
  caseId: string | null;
  briefingId: string | null;
  webhooksSent: number;
  durationMs: number;
}

// Concurrency limiter
let activeTriage = 0;
const MAX_CONCURRENT_TRIAGE = 10;

/**
 * Decide whether an event warrants automatic triage.
 * Triggers on CRITICAL/HIGH severity with risk score >= 70.
 */
export function shouldTriggerTriage(event: {
  severity: string;
  riskScore: number;
}): boolean {
  const highSeverity = ["SENTINEL_CRITICAL", "SENTINEL_HIGH"].includes(event.severity);
  return highSeverity && event.riskScore >= 70;
}

/**
 * Run the autonomous triage pipeline for a critical event.
 * Fire-and-forget — updates its own status in the database.
 */
export async function runTriageAgent(
  eventId: string,
  organizationId?: string,
): Promise<TriageResult> {
  if (activeTriage >= MAX_CONCURRENT_TRIAGE) {
    throw new Error("Triage concurrency limit reached");
  }

  activeTriage++;
  const startTime = Date.now();
  const stagesCompleted: string[] = [];
  const screeningResults: ComprehensiveScreeningResult[] = [];
  let crisisScore: number | null = null;
  let caseId: string | null = null;
  let briefingId: string | null = null;
  let webhooksSent = 0;

  // Create triage run record
  const run = await db.sentinelTriageRun.create({
    data: {
      eventId,
      organizationId,
      status: "PENDING",
      triggeredBy: "auto",
    },
  });

  try {
    // Load the event
    const event = await db.intelligenceEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      await updateStatus(run.id, "FAILED", { error: "Event not found" });
      activeTriage--;
      return { runId: run.id, stagesCompleted, screeningResults, crisisScore, caseId, briefingId, webhooksSent, durationMs: Date.now() - startTime };
    }

    // --- Stage 1: Entity Screening ---
    await updateStatus(run.id, "SCREENING");
    try {
      const entities = event.entities || [];
      const screeningIds: string[] = [];

      for (const entityName of entities.slice(0, 5)) {
        try {
          const result = await screenEntity({
            name: entityName,
            entityType: "organization",
          });
          screeningResults.push(result);
          screeningIds.push(entityName);
        } catch {
          // Individual entity screening failure is non-fatal
        }
      }

      stagesCompleted.push("screening");
      await db.sentinelTriageRun.update({
        where: { id: run.id },
        data: { screeningIds, stagesCompleted },
      });
    } catch (err) {
      console.error(`[Triage/${run.id}] Screening stage failed:`, err);
    }

    // --- Stage 2: Crisis Scoring ---
    await updateStatus(run.id, "SCORING");
    try {
      if (event.countryCode) {
        const crisis = calculateCrisisScore(event.countryCode, {
          conflictEvents: 0,
          fatalities: 0,
          protestEvents: 0,
          militaryActivity: 0,
          internetOutages: 0,
          newsVelocity: 0,
        });
        crisisScore = crisis.score;

        await db.sentinelTriageRun.update({
          where: { id: run.id },
          data: {
            crisisScore,
            crisisLevel: crisis.level,
            stagesCompleted: [...stagesCompleted, "scoring"],
          },
        });
      }
      stagesCompleted.push("scoring");
    } catch (err) {
      console.error(`[Triage/${run.id}] Scoring stage failed:`, err);
    }

    // --- Stage 3: Watchlist Check ---
    try {
      await checkEventAgainstWatchlists(event);
      stagesCompleted.push("watchlist");
    } catch (err) {
      console.error(`[Triage/${run.id}] Watchlist check failed:`, err);
    }

    // --- Stage 4: Auto-Generate Briefing ---
    await updateStatus(run.id, "BRIEFING");
    try {
      // Find a system user or use first org admin for briefing creation
      const briefingUser = organizationId
        ? await db.sentinelOrgMember.findFirst({
            where: { organizationId, role: "ADMIN", isActive: true },
            select: { userId: true },
          })
        : null;

      if (briefingUser) {
        const briefing = await createBriefing({
          userId: briefingUser.userId,
          title: `[AUTO-TRIAGE] ${event.headline.slice(0, 200)}`,
          eventIds: [eventId],
        });

        briefingId = briefing.id;
        stagesCompleted.push("briefing");

        await db.sentinelTriageRun.update({
          where: { id: run.id },
          data: { briefingId, stagesCompleted },
        });
      }
    } catch (err) {
      console.error(`[Triage/${run.id}] Briefing stage failed:`, err);
    }

    // --- Stage 5: Auto-Create Case ---
    try {
      const caseUser = organizationId
        ? await db.sentinelOrgMember.findFirst({
            where: { organizationId, role: "ADMIN", isActive: true },
            select: { userId: true },
          })
        : null;

      if (caseUser) {
        const severity = event.severity === "SENTINEL_CRITICAL" ? "CRITICAL" : "HIGH";
        const newCase = await createCase({
          createdById: caseUser.userId,
          title: `[AUTO-TRIAGE] ${event.headline.slice(0, 300)}`,
          description: `Automatically created by triage agent for ${event.severity} event.\n\nCountry: ${event.countryCode || "N/A"}\nCategory: ${event.category}\nRisk Score: ${event.riskScore}`,
          priority: severity as "CRITICAL" | "HIGH",
          eventIds: [eventId],
          tags: ["auto-triage", event.category.toLowerCase()],
        });

        caseId = newCase.id;
        stagesCompleted.push("case");

        await db.sentinelTriageRun.update({
          where: { id: run.id },
          data: { caseId, stagesCompleted },
        });
      }
    } catch (err) {
      console.error(`[Triage/${run.id}] Case creation failed:`, err);
    }

    // --- Stage 6: Webhook Notification ---
    await updateStatus(run.id, "NOTIFYING");
    try {
      const payload = buildIntelligenceAlert({
        headline: event.headline,
        category: event.category,
        severity: event.severity.replace("SENTINEL_", "").toLowerCase(),
        riskScore: event.riskScore,
        countryCode: event.countryCode,
        source: event.source,
      });

      // Broadcast to all org members' webhooks
      if (organizationId) {
        const orgMembers = await db.sentinelOrgMember.findMany({
          where: { organizationId, isActive: true },
          select: { userId: true },
        });

        for (const member of orgMembers) {
          const results = await broadcastAlert(member.userId, payload);
          webhooksSent += results.filter((r) => r.success).length;
        }
      }

      stagesCompleted.push("notify");
    } catch (err) {
      console.error(`[Triage/${run.id}] Notification stage failed:`, err);
    }

    // --- Complete ---
    const durationMs = Date.now() - startTime;
    await db.sentinelTriageRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        stagesCompleted,
        webhooksSent,
        durationMs,
        completedAt: new Date(),
      },
    });

    console.log(
      `[Triage/${run.id}] Completed in ${durationMs}ms — stages: ${stagesCompleted.join(", ")}`,
    );

    activeTriage--;
    return { runId: run.id, stagesCompleted, screeningResults, crisisScore, caseId, briefingId, webhooksSent, durationMs };
  } catch (error) {
    activeTriage--;
    const durationMs = Date.now() - startTime;
    const errMsg = error instanceof Error ? error.message : String(error);

    await db.sentinelTriageRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        error: errMsg,
        stagesCompleted,
        durationMs,
        completedAt: new Date(),
      },
    }).catch(() => {});

    console.error(`[Triage/${run.id}] Failed after ${durationMs}ms:`, errMsg);
    return { runId: run.id, stagesCompleted, screeningResults, crisisScore, caseId, briefingId, webhooksSent, durationMs };
  }
}

async function updateStatus(
  runId: string,
  status: TriageStatus,
  extra?: { error?: string },
) {
  await db.sentinelTriageRun.update({
    where: { id: runId },
    data: { status, ...extra },
  }).catch(() => {});
}

/** Get triage history for an organization */
export async function getTriageRuns(params: {
  organizationId?: string;
  eventId?: string;
  status?: TriageStatus;
  page?: number;
  limit?: number;
}) {
  const page = params.page ?? 1;
  const limit = Math.min(params.limit ?? 20, 50);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (params.organizationId) where.organizationId = params.organizationId;
  if (params.eventId) where.eventId = params.eventId;
  if (params.status) where.status = params.status;

  const [runs, total] = await Promise.all([
    db.sentinelTriageRun.findMany({
      where,
      include: {
        event: { select: { headline: true, severity: true, category: true, countryCode: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.sentinelTriageRun.count({ where }),
  ]);

  return { data: runs, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}
