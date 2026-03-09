import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAuditLogs } from "@/lib/sentinel/audit";
import { authorizeOrgAction } from "@/lib/sentinel/organizations";
import type { SentinelAuditAction } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId") || undefined;
    const action = searchParams.get("action") as SentinelAuditAction | undefined;
    const resourceType = searchParams.get("resourceType") || undefined;
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 50;

    // If querying org logs, require MANAGER role
    if (organizationId) {
      const authz = await authorizeOrgAction(
        session.user.id,
        organizationId,
        "MANAGER",
      );
      if (!authz.authorized) {
        return NextResponse.json({ error: authz.error }, { status: 403 });
      }
    }

    const result = await getAuditLogs({
      organizationId,
      userId: organizationId ? undefined : session.user.id,
      action: action || undefined,
      resourceType,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Sentinel Audit Logs GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
