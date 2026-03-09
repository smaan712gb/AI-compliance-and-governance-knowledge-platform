// ============================================
// SENTINEL — Audit Trail (SOC 2 Compliance)
// Fire-and-forget logging for all API actions
// ============================================

import { db } from "@/lib/db";
import type { SentinelAuditAction } from "@prisma/client";

export interface AuditContext {
  userId: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit event (fire-and-forget).
 * Never throws — silently catches errors to avoid blocking API responses.
 */
export function logAuditEvent(
  ctx: AuditContext,
  action: SentinelAuditAction,
  opts?: {
    resourceType?: string;
    resourceId?: string;
    params?: Record<string, unknown>;
    result?: "success" | "failure" | "denied";
  },
): void {
  // Sanitize params — strip sensitive fields
  const sanitized = opts?.params ? sanitizeParams(opts.params) : undefined;

  db.sentinelAuditLog
    .create({
      data: {
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        action,
        resourceType: opts?.resourceType,
        resourceId: opts?.resourceId,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent?.slice(0, 500),
        params: sanitized as unknown as undefined,
        result: opts?.result ?? "success",
      },
    })
    .catch((err) => {
      console.error("[Sentinel/Audit] Failed to log audit event:", err);
    });
}

/** Extract audit context from a NextRequest */
export function extractAuditContext(
  req: { headers: { get(name: string): string | null } },
  userId: string,
  organizationId?: string,
): AuditContext {
  return {
    userId,
    organizationId,
    ipAddress:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      undefined,
    userAgent: req.headers.get("user-agent") || undefined,
  };
}

/** Get audit logs with filtering and pagination */
export async function getAuditLogs(params: {
  organizationId?: string;
  userId?: string;
  action?: SentinelAuditAction;
  resourceType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}) {
  const page = params.page ?? 1;
  const limit = Math.min(params.limit ?? 50, 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (params.organizationId) where.organizationId = params.organizationId;
  if (params.userId) where.userId = params.userId;
  if (params.action) where.action = params.action;
  if (params.resourceType) where.resourceType = params.resourceType;
  if (params.dateFrom || params.dateTo) {
    where.timestamp = {
      ...(params.dateFrom && { gte: params.dateFrom }),
      ...(params.dateTo && { lte: params.dateTo }),
    };
  }

  const [logs, total] = await Promise.all([
    db.sentinelAuditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip,
      take: limit,
    }),
    db.sentinelAuditLog.count({ where }),
  ]);

  return {
    data: logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// --- Helpers ---

const SENSITIVE_KEYS = new Set([
  "apiKey",
  "apikey",
  "api_key",
  "password",
  "secret",
  "token",
  "authorization",
  "apiKeyEncrypted",
]);

function sanitizeParams(
  params: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "string" && value.length > 500) {
      sanitized[key] = value.slice(0, 500) + "…";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
