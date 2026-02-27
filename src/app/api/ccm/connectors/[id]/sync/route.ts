import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { triggerSyncSchema } from "@/lib/validators/ccm-connector";
import { checkCCMPermission, getUserOrganization } from "@/lib/ccm/rbac";
import { decryptConfig } from "@/lib/ccm/crypto";
import { createConnector } from "@/lib/connectors/registry";
import { logAuditEvent, extractRequestMeta } from "@/lib/ccm/audit-logger";
import type { SyncDomain } from "@prisma/client";

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

    const body = await req.json();
    const parsed = triggerSyncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error" }, { status: 400 });
    }

    const domain = (parsed.data.domain || "ALL") as SyncDomain;

    // Create sync job
    const syncJob = await db.connectorSyncJob.create({
      data: {
        connectorId: id,
        domain,
        status: "RUNNING",
        startedAt: new Date(),
        parameters: {
          dateFrom: parsed.data.dateFrom || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          dateTo: parsed.data.dateTo || new Date().toISOString(),
        },
      },
    });

    // Run sync in background (fire-and-forget)
    runSync(connector, orgId, syncJob.id, domain, parsed.data).catch((err) => {
      console.error("[CCM Sync] Background sync error:", err);
    });

    const { ipAddress, userAgent } = extractRequestMeta(req);
    await logAuditEvent({
      organizationId: orgId,
      userId: session.user.id,
      action: "TRIGGER_SYNC",
      resourceType: "connector",
      resourceId: id,
      details: { domain, syncJobId: syncJob.id },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      data: { syncJobId: syncJob.id, status: "RUNNING" },
    });
  } catch (error) {
    console.error("[CCM Sync] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function runSync(
  connectorRecord: { id: string; erpType: string; configEncrypted: string },
  orgId: string,
  syncJobId: string,
  domain: SyncDomain,
  params: { dateFrom?: string; dateTo?: string }
) {
  let totalPulled = 0;
  let totalFailed = 0;

  try {
    const config = decryptConfig<Record<string, unknown>>(connectorRecord.configEncrypted, orgId);
    const connector = createConnector(connectorRecord.erpType as any, config as any);
    await connector.connect();

    const pullParams = {
      dateFrom: params.dateFrom ? new Date(params.dateFrom) : new Date(Date.now() - 7 * 86400000),
      dateTo: params.dateTo ? new Date(params.dateTo) : new Date(),
      limit: 1000,
    };

    const domains = domain === "ALL"
      ? connector.getSupportedDomains().filter((d) => d !== "ALL")
      : [domain];

    for (const d of domains) {
      try {
        let records: unknown[] = [];
        let dataType = "";

        switch (d) {
          case "SOX_CONTROLS": {
            const je = await connector.pullJournalEntries(pullParams);
            records = je.records;
            dataType = "journal_entry";
            break;
          }
          case "ACCESS_CONTROL": {
            const ua = await connector.pullUserAccess(pullParams);
            records = ua.records;
            dataType = "user_access";
            break;
          }
          case "AUDIT_TRAIL": {
            const cd = await connector.pullChangeDocuments(pullParams);
            records = cd.records;
            dataType = "change_log";
            break;
          }
          case "AML_KYC": {
            const hvt = await connector.pullHighValueTransactions({
              ...pullParams,
              threshold: 10000,
            });
            records = hvt.records;
            dataType = "suspicious_transaction";
            break;
          }
        }

        // Store data points
        for (const record of records) {
          try {
            await db.eRPDataPoint.create({
              data: {
                connectorId: connectorRecord.id,
                syncJobId,
                domain: d,
                dataType,
                data: record as any,
              },
            });
            totalPulled++;
          } catch {
            totalFailed++;
          }
        }
      } catch (err) {
        console.error(`[CCM Sync] Domain ${d} failed:`, err);
        totalFailed++;
      }
    }

    await connector.disconnect();

    // Update sync job
    await db.connectorSyncJob.update({
      where: { id: syncJobId },
      data: {
        status: totalFailed > 0 ? "PARTIAL" : "COMPLETED",
        completedAt: new Date(),
        recordsPulled: totalPulled,
        recordsFailed: totalFailed,
      },
    });

    // Update connector last sync
    await db.eRPConnector.update({
      where: { id: connectorRecord.id },
      data: { lastSyncAt: new Date(), lastError: null },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await db.connectorSyncJob.update({
      where: { id: syncJobId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        recordsPulled: totalPulled,
        recordsFailed: totalFailed,
        errorLog: { error: errorMessage },
      },
    });
    // Also surface the error on the connector so the UI shows a warning
    await db.eRPConnector.update({
      where: { id: connectorRecord.id },
      data: { lastError: errorMessage },
    }).catch(() => { /* non-fatal */ });
  }
}
