import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { queryFindingsSchema } from "@/lib/validators/ccm-finding";
import { checkCCMPermission, getUserOrganization } from "@/lib/ccm/rbac";

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
    const perm = await checkCCMPermission(session.user.id, orgId, "finding", "read");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = queryFindingsSchema.safeParse({
      status: searchParams.get("status") || undefined,
      severity: searchParams.get("severity") || undefined,
      framework: searchParams.get("framework") || undefined,
      assignedTo: searchParams.get("assignedTo") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      offset: searchParams.get("offset") ? Number(searchParams.get("offset")) : undefined,
    });

    if (!query.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: query.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = { organizationId: orgId };
    if (query.data.status) where.status = query.data.status;
    if (query.data.severity) where.severity = query.data.severity;
    if (query.data.framework) where.framework = query.data.framework;
    if (query.data.assignedTo) where.assignedTo = query.data.assignedTo;
    if (query.data.dateFrom || query.data.dateTo) {
      where.createdAt = {
        ...(query.data.dateFrom ? { gte: new Date(query.data.dateFrom) } : {}),
        ...(query.data.dateTo ? { lte: new Date(query.data.dateTo) } : {}),
      };
    }

    const [findings, total] = await Promise.all([
      db.finding.findMany({
        where,
        orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
        take: query.data.limit,
        skip: query.data.offset,
        include: {
          rule: { select: { id: true, name: true, framework: true, controlId: true } },
          remediationPlan: { select: { id: true, approvedAt: true } },
          _count: { select: { dataPoints: true } },
        },
      }),
      db.finding.count({ where }),
    ]);

    return NextResponse.json({
      data: findings,
      pagination: {
        total,
        limit: query.data.limit,
        offset: query.data.offset,
      },
    });
  } catch (error) {
    console.error("[CCM Findings] GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
