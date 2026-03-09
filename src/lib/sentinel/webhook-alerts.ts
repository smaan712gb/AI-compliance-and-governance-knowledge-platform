// ============================================
// SENTINEL — Webhook Alert System (Enterprise)
// Push critical events to subscriber endpoints
// Retry logic, circuit breaker, delivery recording
// ============================================

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { EventSeverity } from "./types";

export interface WebhookPayload {
  eventType: "intelligence_event" | "keyword_spike" | "crisis_escalation" | "screening_alert";
  severity: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
  webhookId: string;
  url: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  latencyMs: number;
}

// ---- Severity Threshold Filter ----

const SEVERITY_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

export function shouldTriggerWebhook(
  eventSeverity: EventSeverity,
  minSeverity: EventSeverity
): boolean {
  return (SEVERITY_ORDER[eventSeverity] ?? 0) >= (SEVERITY_ORDER[minSeverity] ?? 0);
}

// ---- Webhook Delivery with Retry ----

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 10000]; // exponential-ish backoff

async function deliverWithRetry(
  webhookId: string,
  url: string,
  payload: WebhookPayload,
  secret?: string,
): Promise<WebhookDeliveryResult> {
  const body = JSON.stringify(payload);
  let lastError = "";
  let lastStatusCode: number | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt - 1]));
    }

    const startTime = Date.now();
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "Sentinel-Webhook/1.0",
        "X-Sentinel-Event": payload.eventType,
        "X-Sentinel-Timestamp": payload.timestamp,
        "X-Sentinel-Delivery": webhookId,
        "X-Sentinel-Attempt": String(attempt + 1),
      };

      // HMAC signature for webhook verification
      if (secret) {
        const { createHmac } = await import("crypto");
        const signature = createHmac("sha256", secret).update(body).digest("hex");
        headers["X-Sentinel-Signature"] = `sha256=${signature}`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        return { webhookId, url, success: true, statusCode: response.status, latencyMs };
      }

      lastStatusCode = response.status;
      lastError = `HTTP ${response.status}`;

      // Don't retry on 4xx (client errors) — only retry 5xx
      if (response.status >= 400 && response.status < 500) {
        return { webhookId, url, success: false, statusCode: response.status, error: lastError, latencyMs };
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown error";
    }
  }

  return { webhookId, url, success: false, statusCode: lastStatusCode, error: lastError, latencyMs: 0 };
}

// ---- Circuit Breaker ----

const CONSECUTIVE_FAILURE_THRESHOLD = 5;

async function checkCircuitBreaker(webhookId: string): Promise<boolean> {
  const webhook = await db.sentinelWebhook.findUnique({
    where: { id: webhookId },
    select: { failureCount: true, isActive: true },
  });

  if (!webhook || !webhook.isActive) return false;

  // Auto-disable after threshold consecutive failures
  if (webhook.failureCount >= CONSECUTIVE_FAILURE_THRESHOLD) {
    await db.sentinelWebhook.update({
      where: { id: webhookId },
      data: { isActive: false },
    }).catch(() => {});
    return false;
  }

  return true;
}

async function recordDelivery(
  webhookId: string,
  result: WebhookDeliveryResult,
  payload: WebhookPayload,
): Promise<void> {
  // Record delivery attempt
  await db.sentinelWebhookDelivery.create({
    data: {
      webhookId,
      eventType: payload.eventType,
      statusCode: result.statusCode,
      success: result.success,
      error: result.error,
      latencyMs: result.latencyMs,
      payload: payload as unknown as Prisma.InputJsonValue,
    },
  }).catch((err) => {
    console.error(`[Sentinel/Webhook] Failed to record delivery:`, err);
  });

  // Update webhook stats
  if (result.success) {
    await db.sentinelWebhook.update({
      where: { id: webhookId },
      data: {
        lastDeliveryAt: new Date(),
        failureCount: 0,
      },
    }).catch(() => {});
  } else {
    await db.sentinelWebhook.update({
      where: { id: webhookId },
      data: {
        failureCount: { increment: 1 },
        lastError: result.error,
      },
    }).catch(() => {});
  }
}

// ---- Broadcast to all active webhooks for a user ----

export async function broadcastAlert(
  userId: string,
  payload: WebhookPayload,
): Promise<WebhookDeliveryResult[]> {
  // Query user's active webhooks that match the event type and severity
  const webhooks = await db.sentinelWebhook.findMany({
    where: {
      userId,
      isActive: true,
      events: { has: payload.eventType },
    },
    select: {
      id: true,
      url: true,
      secret: true,
      minSeverity: true,
    },
  });

  if (webhooks.length === 0) return [];

  const results: WebhookDeliveryResult[] = [];

  for (const webhook of webhooks) {
    // Check severity threshold
    if (webhook.minSeverity) {
      const eventSev = payload.severity as EventSeverity;
      const minSev = webhook.minSeverity as EventSeverity;
      if (!shouldTriggerWebhook(eventSev, minSev)) continue;
    }

    // Check circuit breaker
    const isHealthy = await checkCircuitBreaker(webhook.id);
    if (!isHealthy) continue;

    // Deliver with retry
    const result = await deliverWithRetry(
      webhook.id,
      webhook.url,
      payload,
      webhook.secret || undefined,
    );

    // Record delivery (fire-and-forget)
    recordDelivery(webhook.id, result, payload).catch(() => {});

    results.push(result);
  }

  return results;
}

// ---- Alert Payload Builders ----

export function buildIntelligenceAlert(event: {
  headline: string;
  category: string;
  severity: string;
  riskScore: number;
  countryCode: string | null;
  source: string;
}): WebhookPayload {
  return {
    eventType: "intelligence_event",
    severity: event.severity,
    timestamp: new Date().toISOString(),
    data: {
      headline: event.headline,
      category: event.category,
      riskScore: event.riskScore,
      countryCode: event.countryCode,
      source: event.source,
    },
  };
}

export function buildKeywordSpikeAlert(spike: {
  keyword: string;
  ratio: number;
  sources: string[];
  severity: string;
}): WebhookPayload {
  return {
    eventType: "keyword_spike",
    severity: spike.severity,
    timestamp: new Date().toISOString(),
    data: {
      keyword: spike.keyword,
      spikeRatio: spike.ratio,
      sourceCount: spike.sources.length,
      sources: spike.sources,
    },
  };
}

export function buildCrisisEscalationAlert(crisis: {
  countryCode: string;
  countryName: string;
  previousScore: number;
  currentScore: number;
  level: string;
}): WebhookPayload {
  return {
    eventType: "crisis_escalation",
    severity: crisis.currentScore >= 80 ? "critical" : "high",
    timestamp: new Date().toISOString(),
    data: {
      countryCode: crisis.countryCode,
      countryName: crisis.countryName,
      previousScore: crisis.previousScore,
      currentScore: crisis.currentScore,
      level: crisis.level,
      delta: crisis.currentScore - crisis.previousScore,
    },
  };
}

export function buildScreeningAlert(screening: {
  entityName: string;
  compositeScore: number;
  recommendation: string;
}): WebhookPayload {
  return {
    eventType: "screening_alert",
    severity: screening.compositeScore >= 75 ? "critical" : "high",
    timestamp: new Date().toISOString(),
    data: {
      entityName: screening.entityName,
      compositeScore: screening.compositeScore,
      recommendation: screening.recommendation,
    },
  };
}
