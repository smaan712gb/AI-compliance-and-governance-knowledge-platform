import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { createRuleSchema, updateRuleSchema } from "@/lib/validators/ccm-rule";
import { checkCCMPermission, getUserOrganization } from "@/lib/ccm/rbac";
import { checkCCMFeatureAccess, isFrameworkAllowed } from "@/lib/ccm/feature-gating";
import { logAuditEvent, extractRequestMeta } from "@/lib/ccm/audit-logger";

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
    const perm = await checkCCMPermission(session.user.id, orgId, "rule", "read");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const framework = searchParams.get("framework");
    const domain = searchParams.get("domain");
    const isActive = searchParams.get("isActive");

    const where: Record<string, unknown> = { organizationId: orgId };
    if (framework) where.framework = framework;
    if (domain) where.domain = domain;
    if (isActive !== null && isActive !== undefined) where.isActive = isActive === "true";

    const rules = await db.monitoringRule.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { runs: true } },
      },
    });

    return NextResponse.json({ data: rules });
  } catch (error) {
    console.error("[CCM Rules] GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
    const perm = await checkCCMPermission(session.user.id, orgId, "rule", "create");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check rule limit
    const featureAccess = await checkCCMFeatureAccess(orgId, "rule");
    if (!featureAccess.allowed) {
      return NextResponse.json(
        { error: `Rule limit reached (${featureAccess.limit}). Upgrade your plan.` },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createRuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Check framework access
    const frameworkAllowed = await isFrameworkAllowed(orgId, parsed.data.framework);
    if (!frameworkAllowed) {
      return NextResponse.json(
        { error: `Framework ${parsed.data.framework} is not available on your plan.` },
        { status: 403 }
      );
    }

    const rule = await db.monitoringRule.create({
      data: {
        organizationId: orgId,
        name: parsed.data.name,
        description: parsed.data.description,
        framework: parsed.data.framework,
        controlId: parsed.data.controlId,
        domain: parsed.data.domain,
        severity: parsed.data.severity,
        ruleDefinition: parsed.data.ruleDefinition as Prisma.InputJsonValue,
        isActive: parsed.data.isActive,
        isBuiltIn: false,
      },
    });

    const { ipAddress, userAgent } = extractRequestMeta(req);
    await logAuditEvent({
      organizationId: orgId,
      userId: session.user.id,
      action: "CREATE_RULE",
      resourceType: "rule",
      resourceId: rule.id,
      details: { name: parsed.data.name, framework: parsed.data.framework },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data: rule }, { status: 201 });
  } catch (error) {
    console.error("[CCM Rules] POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
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
    const perm = await checkCCMPermission(session.user.id, orgId, "rule", "update");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { ruleId, ...updateData } = body;
    if (!ruleId) {
      return NextResponse.json({ error: "ruleId is required" }, { status: 400 });
    }

    const parsed = updateRuleSchema.safeParse(updateData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Verify rule belongs to this org
    const existing = await db.monitoringRule.findFirst({
      where: { id: ruleId, organizationId: orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const { ruleDefinition, ...rest } = parsed.data;
    const updated = await db.monitoringRule.update({
      where: { id: ruleId },
      data: {
        ...rest,
        ...(ruleDefinition !== undefined
          ? { ruleDefinition: ruleDefinition as Prisma.InputJsonValue }
          : {}),
      },
    });

    const { ipAddress, userAgent } = extractRequestMeta(req);
    await logAuditEvent({
      organizationId: orgId,
      userId: session.user.id,
      action: "UPDATE_RULE",
      resourceType: "rule",
      resourceId: ruleId,
      details: parsed.data,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[CCM Rules] PATCH error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
