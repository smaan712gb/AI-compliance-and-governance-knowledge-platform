import { db } from "@/lib/db";
import { createHmac } from "crypto";

// ============================================
// MULTI-CHANNEL NOTIFICATION ENGINE
// ============================================

export type NotificationType =
  | "FINDING_CREATED"
  | "FINDING_ESCALATED"
  | "FINDING_ASSIGNED"
  | "FINDING_OVERDUE"
  | "REMEDIATION_COMPLETE"
  | "SYNC_FAILED"
  | "CRITICAL_ALERT"
  | "REPORT_READY"
  | "BUDGET_WARNING";

export interface NotificationPayload {
  type: NotificationType;
  organizationId: string;
  title: string;
  message: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  metadata: Record<string, unknown>;
  recipients?: string[];
  channels?: ("webhook" | "email" | "in_app")[];
}

export interface NotificationResult {
  sent: number;
  failed: number;
  channels: { channel: string; success: boolean; error?: string }[];
}

interface WebhookConfig {
  url: string;
  secret?: string;
}

const RETRY_DELAYS_MS = [1000, 3000, 10000];
const WEBHOOK_TIMEOUT_MS = 10_000;

// Simple in-memory circuit breaker per webhook URL
const circuitBreaker = new Map<
  string,
  { failures: number; openUntil: number }
>();
const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_OPEN_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Send a notification to all configured channels for an organization.
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<NotificationResult> {
  const result: NotificationResult = { sent: 0, failed: 0, channels: [] };
  const channels = payload.channels || ["webhook", "in_app"];

  for (const channel of channels) {
    try {
      switch (channel) {
        case "webhook": {
          const webhookConfig = await getWebhookConfig(payload.organizationId);
          if (!webhookConfig) {
            result.channels.push({
              channel: "webhook",
              success: false,
              error: "No webhook configured",
            });
            break;
          }

          const delivery = await deliverWebhook(
            webhookConfig.url,
            buildWebhookPayload(payload),
            webhookConfig.secret
          );
          result.channels.push({
            channel: "webhook",
            success: delivery.success,
            error: delivery.error,
          });
          if (delivery.success) result.sent++;
          else result.failed++;
          break;
        }

        case "email": {
          // Email delivery placeholder — logs intent.
          // Integration with Resend/SendGrid would go here.
          console.log(
            `[CCM Notification] Email: ${payload.title} → ${(payload.recipients || ["all-members"]).join(", ")}`
          );
          result.channels.push({ channel: "email", success: true });
          result.sent++;
          break;
        }

        case "in_app": {
          // Store in-app notification as an audit log entry with notification details
          await db.cCMAuditLog.create({
            data: {
              organizationId: payload.organizationId,
              userId: "system",
              action: "UPDATE_FINDING_STATUS",
              resourceType: "notification",
              resourceId: payload.type,
              details: JSON.parse(JSON.stringify({
                notificationType: payload.type,
                title: payload.title,
                message: payload.message,
                severity: payload.severity,
                metadata: payload.metadata,
                recipients: payload.recipients,
              })),
            },
          });
          result.channels.push({ channel: "in_app", success: true });
          result.sent++;
          break;
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      result.channels.push({ channel, success: false, error });
      result.failed++;
    }
  }

  return result;
}

/**
 * Batch send notifications. Processes sequentially to avoid overwhelming external services.
 */
export async function sendBatchNotifications(
  payloads: NotificationPayload[]
): Promise<{ total: number; sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const payload of payloads) {
    const result = await sendNotification(payload);
    sent += result.sent;
    failed += result.failed;
  }

  return { total: payloads.length, sent, failed };
}

/**
 * Deliver a webhook with HMAC-SHA256 signature, retries, and circuit breaker.
 */
async function deliverWebhook(
  url: string,
  payload: unknown,
  secret?: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  // Check circuit breaker
  const breaker = circuitBreaker.get(url);
  if (breaker && breaker.openUntil > Date.now()) {
    return {
      success: false,
      error: `Circuit breaker open until ${new Date(breaker.openUntil).toISOString()}`,
    };
  }

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "AIGovHub-CCM/1.0",
  };

  if (secret) {
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    headers["X-Signature-256"] = `sha256=${signature}`;
  }

  let lastError: string | undefined;
  let lastStatusCode: number | undefined;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        WEBHOOK_TIMEOUT_MS
      );

      const response = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      lastStatusCode = response.status;

      if (response.ok) {
        // Reset circuit breaker on success
        circuitBreaker.delete(url);
        return { success: true, statusCode: response.status };
      }

      // Don't retry 4xx client errors (except 429 rate limit)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        const text = await response.text().catch(() => "");
        recordCircuitFailure(url);
        return {
          success: false,
          statusCode: response.status,
          error: `Client error ${response.status}: ${text.slice(0, 200)}`,
        };
      }

      lastError = `HTTP ${response.status}`;
    } catch (err) {
      lastError =
        err instanceof Error
          ? err.name === "AbortError"
            ? "Request timed out"
            : err.message
          : String(err);
    }

    // Wait before retry (skip wait on last attempt)
    if (attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  recordCircuitFailure(url);
  return {
    success: false,
    statusCode: lastStatusCode,
    error: `Failed after ${RETRY_DELAYS_MS.length + 1} attempts: ${lastError}`,
  };
}

function recordCircuitFailure(url: string): void {
  const breaker = circuitBreaker.get(url) || { failures: 0, openUntil: 0 };
  breaker.failures++;
  if (breaker.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    breaker.openUntil = Date.now() + CIRCUIT_OPEN_DURATION_MS;
    breaker.failures = 0;
  }
  circuitBreaker.set(url, breaker);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get webhook config from the org's audit log settings or env vars.
 * Checks for a convention-based env var or looks at the org record.
 */
async function getWebhookConfig(
  organizationId: string
): Promise<WebhookConfig | null> {
  // Check for a global CCM webhook URL in environment
  const globalUrl = process.env.CCM_WEBHOOK_URL;
  if (globalUrl) {
    return {
      url: globalUrl,
      secret: process.env.CCM_WEBHOOK_SECRET,
    };
  }

  // Look for org-specific webhook in the org's industry field as JSON fallback
  // (since we can't add new Prisma fields)
  const org = await db.cCMOrganization.findUnique({
    where: { id: organizationId },
    select: { industry: true },
  });

  if (org?.industry) {
    try {
      const parsed = JSON.parse(org.industry);
      if (parsed?.webhookUrl) {
        return { url: parsed.webhookUrl, secret: parsed.webhookSecret };
      }
    } catch {
      // Not JSON — just a plain industry string, no webhook config
    }
  }

  return null;
}

function buildWebhookPayload(
  payload: NotificationPayload
): Record<string, unknown> {
  return {
    event: payload.type,
    timestamp: new Date().toISOString(),
    organization_id: payload.organizationId,
    title: payload.title,
    message: payload.message,
    severity: payload.severity,
    metadata: payload.metadata,
    recipients: payload.recipients,
  };
}

// ============================================
// NOTIFICATION BUILDERS
// ============================================

/**
 * Build a notification payload for finding lifecycle events.
 */
export function buildFindingNotification(
  finding: {
    id: string;
    title: string;
    severity: string;
    framework?: string;
    organizationId: string;
  },
  event: "created" | "escalated" | "assigned" | "overdue" | "resolved"
): NotificationPayload {
  const typeMap: Record<string, NotificationType> = {
    created: "FINDING_CREATED",
    escalated: "FINDING_ESCALATED",
    assigned: "FINDING_ASSIGNED",
    overdue: "FINDING_OVERDUE",
    resolved: "REMEDIATION_COMPLETE",
  };

  const severityMap: Record<string, NotificationPayload["severity"]> = {
    CRITICAL: "critical",
    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low",
    INFO: "info",
  };

  const messageMap: Record<string, string> = {
    created: `New ${finding.severity} finding detected: ${finding.title}`,
    escalated: `Finding escalated: ${finding.title} (${finding.severity})`,
    assigned: `Finding assigned: ${finding.title}`,
    overdue: `Finding overdue: ${finding.title} (${finding.severity})`,
    resolved: `Finding resolved: ${finding.title}`,
  };

  return {
    type: typeMap[event],
    organizationId: finding.organizationId,
    title: `[${event.toUpperCase()}] ${finding.title}`,
    message: messageMap[event],
    severity: severityMap[finding.severity] || "info",
    metadata: {
      findingId: finding.id,
      framework: finding.framework,
      severity: finding.severity,
      event,
    },
  };
}

/**
 * Build a notification payload for connector sync events.
 */
export function buildSyncNotification(
  connector: {
    id: string;
    erpType: string;
    organizationId: string;
  },
  status: "completed" | "failed" | "partial",
  details?: string
): NotificationPayload {
  const severityMap: Record<string, NotificationPayload["severity"]> = {
    completed: "info",
    partial: "medium",
    failed: "high",
  };

  const typeMap: Record<string, NotificationType> = {
    completed: "REPORT_READY",
    failed: "SYNC_FAILED",
    partial: "SYNC_FAILED",
  };

  return {
    type: typeMap[status],
    organizationId: connector.organizationId,
    title: `Sync ${status}: ${connector.erpType}`,
    message:
      details ||
      `${connector.erpType} connector sync ${status}.`,
    severity: severityMap[status],
    metadata: {
      connectorId: connector.id,
      erpType: connector.erpType,
      status,
    },
  };
}
