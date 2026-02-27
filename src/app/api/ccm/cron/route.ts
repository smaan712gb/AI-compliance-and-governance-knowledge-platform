import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decryptConfig } from "@/lib/ccm/crypto";
import { createConnector } from "@/lib/connectors/registry";
import { runMonitoringCycle } from "@/lib/ccm/rule-engine";
import { analyzeRecentFindings } from "@/lib/ccm/analysis-engine";
import type { SyncDomain } from "@prisma/client";

/**
 * CCM Cron endpoint — called by external cron service (e.g., cron-job.org)
 * Handles: scheduled syncs + monitoring rule evaluation + AI analysis
 *
 * POST /api/ccm/cron
 * Authorization: Bearer <CRON_SECRET>
 */
export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results = {
    syncs: { started: 0, errors: [] as string[] },
    monitoring: { orgsProcessed: 0, rulesEvaluated: 0, findingsCreated: 0, errors: [] as string[] },
    analysis: { orgsProcessed: 0, analyzed: 0, tokensUsed: 0, errors: [] as string[] },
  };

  try {
    // 1. Run scheduled syncs
    const connectors = await db.eRPConnector.findMany({
      where: {
        isActive: true,
        status: "CONNECTED",
        syncFrequency: { not: "MANUAL" },
      },
      include: { organization: { select: { id: true } } },
    });

    for (const connector of connectors) {
      // Check if sync is due
      const isDue = isSyncDue(connector.syncFrequency, connector.lastSyncAt);
      if (!isDue) continue;

      try {
        // Create sync job and run in background
        const syncJob = await db.connectorSyncJob.create({
          data: {
            connectorId: connector.id,
            domain: "ALL" as SyncDomain,
            status: "RUNNING",
            startedAt: new Date(),
            parameters: {
              dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              dateTo: new Date().toISOString(),
            },
          },
        });

        // Fire-and-forget sync
        runConnectorSync(connector, syncJob.id).catch((err) => {
          console.error(`[CCM Cron] Sync error for ${connector.id}:`, err);
        });

        results.syncs.started++;
      } catch (err) {
        results.syncs.errors.push(`Connector ${connector.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 2. Run monitoring rules for all organizations with active or trialing subscriptions
    const organizations = await db.cCMOrganization.findMany({
      where: {
        subscription: { status: { in: ["ACTIVE", "TRIALING"] } },
        members: { some: { isActive: true } },
      },
      select: { id: true },
    });

    for (const org of organizations) {
      try {
        const cycleResult = await runMonitoringCycle(org.id);
        results.monitoring.rulesEvaluated += cycleResult.rulesEvaluated;
        results.monitoring.findingsCreated += cycleResult.findingsCreated;
        results.monitoring.errors.push(...cycleResult.errors);
        results.monitoring.orgsProcessed++;
      } catch (err) {
        results.monitoring.errors.push(`Org ${org.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 3. Run AI analysis on unanalyzed findings
    for (const org of organizations) {
      try {
        const analysisResult = await analyzeRecentFindings(org.id);
        results.analysis.analyzed += analysisResult.analyzed;
        results.analysis.tokensUsed += analysisResult.tokensUsed;
        results.analysis.errors.push(...analysisResult.errors);
        results.analysis.orgsProcessed++;
      } catch (err) {
        results.analysis.errors.push(`Org ${org.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    console.error("[CCM Cron] Fatal error:", err);
    return NextResponse.json(
      { error: "Cron execution failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  const duration = Date.now() - startTime;

  return NextResponse.json({
    success: true,
    durationMs: duration,
    results,
  });
}

function isSyncDue(frequency: string, lastSyncAt: Date | null): boolean {
  if (!lastSyncAt) return true;

  const now = Date.now();
  const lastSync = lastSyncAt.getTime();
  const hoursSinceSync = (now - lastSync) / (60 * 60 * 1000);

  switch (frequency) {
    case "EVERY_HOUR": return hoursSinceSync >= 1;
    case "EVERY_4_HOURS": return hoursSinceSync >= 4;
    case "EVERY_12_HOURS": return hoursSinceSync >= 12;
    case "DAILY": return hoursSinceSync >= 24;
    default: return false;
  }
}

async function runConnectorSync(
  connector: { id: string; erpType: string; configEncrypted: string; organization: { id: string } },
  syncJobId: string
) {
  let totalPulled = 0;
  let totalFailed = 0;

  try {
    const config = decryptConfig<Record<string, unknown>>(connector.configEncrypted, connector.organization.id);
    const instance = createConnector(connector.erpType as any, config as any);
    await instance.connect();

    const pullParams = {
      dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000),
      dateTo: new Date(),
      limit: 1000,
    };

    const domains = instance.getSupportedDomains().filter((d) => d !== "ALL");

    for (const domain of domains) {
      try {
        let records: unknown[] = [];
        let dataType = "";

        switch (domain) {
          case "SOX_CONTROLS": {
            const result = await instance.pullJournalEntries(pullParams);
            records = result.records;
            dataType = "journal_entry";
            break;
          }
          case "ACCESS_CONTROL": {
            const result = await instance.pullUserAccess(pullParams);
            records = result.records;
            dataType = "user_access";
            break;
          }
          case "AUDIT_TRAIL": {
            const result = await instance.pullChangeDocuments(pullParams);
            records = result.records;
            dataType = "change_log";
            break;
          }
          case "AML_KYC": {
            const result = await instance.pullHighValueTransactions({ ...pullParams, threshold: 10000 });
            records = result.records;
            dataType = "suspicious_transaction";
            break;
          }
        }

        for (const record of records) {
          try {
            await db.eRPDataPoint.create({
              data: {
                connectorId: connector.id,
                syncJobId,
                domain,
                dataType,
                data: record as object,
              },
            });
            totalPulled++;
          } catch {
            totalFailed++;
          }
        }
      } catch (err) {
        console.error(`[CCM Cron] Domain ${domain} failed:`, err);
        totalFailed++;
      }
    }

    await instance.disconnect();

    await db.connectorSyncJob.update({
      where: { id: syncJobId },
      data: {
        status: totalFailed > 0 ? "PARTIAL" : "COMPLETED",
        completedAt: new Date(),
        recordsPulled: totalPulled,
        recordsFailed: totalFailed,
      },
    });

    await db.eRPConnector.update({
      where: { id: connector.id },
      data: { lastSyncAt: new Date(), lastError: null },
    });
  } catch (err) {
    await db.connectorSyncJob.update({
      where: { id: syncJobId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        recordsPulled: totalPulled,
        recordsFailed: totalFailed,
        errorLog: { error: err instanceof Error ? err.message : String(err) },
      },
    });
  }
}
