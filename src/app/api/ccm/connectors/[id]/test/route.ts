import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkCCMPermission, getUserOrganization } from "@/lib/ccm/rbac";
import { decryptConfig } from "@/lib/ccm/crypto";
import { createConnector } from "@/lib/connectors/registry";
import { logAuditEvent, extractRequestMeta } from "@/lib/ccm/audit-logger";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const perm = await checkCCMPermission(session.user.id, orgId, "connector", "update");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const connector = await db.eRPConnector.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!connector) {
      return NextResponse.json({ error: "Connector not found" }, { status: 404 });
    }

    // Decrypt config and create connector instance
    const config = decryptConfig<Record<string, unknown>>(connector.configEncrypted, orgId);
    const instance = createConnector(connector.erpType as any, config as any);

    // Update status to TESTING
    await db.eRPConnector.update({
      where: { id },
      data: { status: "TESTING" },
    });

    // Test the connection
    const result = await instance.testConnection();

    // Update status based on result
    await db.eRPConnector.update({
      where: { id },
      data: {
        status: result.success ? "CONNECTED" : "SYNC_ERROR",
        lastTestedAt: new Date(),
        lastError: result.errors.length > 0 ? result.errors.join("; ") : null,
      },
    });

    const { ipAddress, userAgent } = extractRequestMeta(req);
    await logAuditEvent({
      organizationId: orgId,
      userId: session.user.id,
      action: "TEST_CONNECTOR",
      resourceType: "connector",
      resourceId: id,
      details: { success: result.success, latencyMs: result.latencyMs },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[CCM Connector Test] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
