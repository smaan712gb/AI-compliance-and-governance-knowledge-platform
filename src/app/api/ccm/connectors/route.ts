import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createConnectorSchema } from "@/lib/validators/ccm-connector";
import { checkCCMPermission, getUserOrganization } from "@/lib/ccm/rbac";
import { checkCCMFeatureAccess } from "@/lib/ccm/feature-gating";
import { encryptConfig } from "@/lib/ccm/crypto";
import { logAuditEvent, extractRequestMeta } from "@/lib/ccm/audit-logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgResult = await getUserOrganization(session.user.id);
    if (!orgResult) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const perm = await checkCCMPermission(
      session.user.id,
      orgResult.organization.id,
      "connector",
      "read"
    );
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const connectors = await db.eRPConnector.findMany({
      where: { organizationId: orgResult.organization.id },
      select: {
        id: true,
        name: true,
        erpType: true,
        status: true,
        lastTestedAt: true,
        lastSyncAt: true,
        lastError: true,
        syncFrequency: true,
        isActive: true,
        createdAt: true,
        // configEncrypted is NOT selected — never send to frontend
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ data: connectors });
  } catch (error) {
    console.error("[CCM Connectors] GET error:", error);
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
    const perm = await checkCCMPermission(session.user.id, orgId, "connector", "create");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check connector limit
    const featureAccess = await checkCCMFeatureAccess(orgId, "connector");
    if (!featureAccess.allowed) {
      return NextResponse.json(
        { error: `Connector limit reached (${featureAccess.limit}). Upgrade your plan.` },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createConnectorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Encrypt the config before storing
    const encrypted = encryptConfig(parsed.data.config, orgId);

    const connector = await db.eRPConnector.create({
      data: {
        organizationId: orgId,
        name: parsed.data.name,
        erpType: parsed.data.erpType,
        configEncrypted: encrypted,
        syncFrequency: parsed.data.syncFrequency,
      },
    });

    const { ipAddress, userAgent } = extractRequestMeta(req);
    await logAuditEvent({
      organizationId: orgId,
      userId: session.user.id,
      action: "CREATE_CONNECTOR",
      resourceType: "connector",
      resourceId: connector.id,
      details: { name: parsed.data.name, erpType: parsed.data.erpType },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        data: {
          id: connector.id,
          name: connector.name,
          erpType: connector.erpType,
          status: connector.status,
          syncFrequency: connector.syncFrequency,
          createdAt: connector.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[CCM Connectors] POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
