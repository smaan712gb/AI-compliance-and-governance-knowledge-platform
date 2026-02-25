import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { checkCCMPermission, getUserOrganization } from "@/lib/ccm/rbac";
import { CCM_RULE_TEMPLATES } from "@/lib/constants/ccm-rule-templates";

export async function POST(_req: NextRequest) {
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

    // Only create rules that don't already exist (idempotent by controlId)
    const existing = await db.monitoringRule.findMany({
      where: { organizationId: orgId, isBuiltIn: true },
      select: { controlId: true },
    });
    const existingControlIds = new Set(existing.map((r) => r.controlId));

    const toCreate = CCM_RULE_TEMPLATES.filter(
      (t) => !existingControlIds.has(t.controlId)
    );

    if (toCreate.length === 0) {
      return NextResponse.json({
        data: { created: 0, message: "All built-in templates already loaded." },
      });
    }

    await db.monitoringRule.createMany({
      data: toCreate.map((t) => ({
        organizationId: orgId,
        name: t.name,
        description: t.description,
        framework: t.framework,
        controlId: t.controlId,
        domain: t.domain,
        severity: t.severity,
        ruleDefinition: t.ruleDefinition as Prisma.InputJsonValue,
        isActive: true,
        isBuiltIn: true,
      })),
    });

    return NextResponse.json(
      {
        data: {
          created: toCreate.length,
          message: `Loaded ${toCreate.length} built-in compliance rules.`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[CCM Rules Templates] POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
