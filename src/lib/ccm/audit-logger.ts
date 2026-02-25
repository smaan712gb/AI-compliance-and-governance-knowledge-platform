import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { AuditAction } from "@prisma/client";

interface AuditLogInput {
  organizationId: string;
  userId: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Logs an immutable audit event to the CCMAuditLog table.
 * Fire-and-forget — errors are logged but do not block the caller.
 */
export async function logAuditEvent(input: AuditLogInput): Promise<void> {
  try {
    await db.cCMAuditLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        action: input.action,
        resourceType: input.resourceType || null,
        resourceId: input.resourceId || null,
        details: (input.details as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
      },
    });
  } catch (err) {
    console.error(
      "[CCM Audit] Failed to log event:",
      input.action,
      err instanceof Error ? err.message : String(err)
    );
  }
}

/**
 * Extracts IP address and user agent from a request for audit logging.
 */
export function extractRequestMeta(req: Request): {
  ipAddress: string;
  userAgent: string;
} {
  const headers = req.headers;
  const ipAddress =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown";
  const userAgent = headers.get("user-agent") || "unknown";
  return { ipAddress, userAgent };
}

/**
 * Query audit logs for an organization with pagination.
 */
export async function queryAuditLogs(params: {
  organizationId: string;
  action?: AuditAction;
  userId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {
    organizationId: params.organizationId,
  };
  if (params.action) where.action = params.action;
  if (params.userId) where.userId = params.userId;
  if (params.from || params.to) {
    where.timestamp = {
      ...(params.from ? { gte: params.from } : {}),
      ...(params.to ? { lte: params.to } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    db.cCMAuditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: params.limit || 50,
      skip: params.offset || 0,
    }),
    db.cCMAuditLog.count({ where }),
  ]);

  return { logs, total };
}
