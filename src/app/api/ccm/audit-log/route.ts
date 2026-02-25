import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkCCMPermission, getUserOrganization } from "@/lib/ccm/rbac";
import { queryAuditLogs } from "@/lib/ccm/audit-logger";
import type { AuditAction } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgResult = await getUserOrganization(session.user.id);
    if (!orgResult) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const orgId = orgResult.organization.id;
    const perm = await checkCCMPermission(session.user.id, orgId, "audit_log", "read");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") as AuditAction | null;
    const userId = searchParams.get("userId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
    const offset = Number(searchParams.get("offset")) || 0;

    const { logs, total } = await queryAuditLogs({
      organizationId: orgId,
      action: action || undefined,
      userId: userId || undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      data: logs,
      pagination: { total, limit, offset },
    });
  } catch (error) {
    console.error("[CCM Audit Log] GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
