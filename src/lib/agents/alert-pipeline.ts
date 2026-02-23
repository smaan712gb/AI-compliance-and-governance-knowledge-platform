import { db } from "@/lib/db";
import { loadConfig } from "./config";
import { runAlertScanner } from "./alert-scanner";
import { runAlertMatcher } from "./alert-matcher";
import type { AgentRunStatus } from "@prisma/client";

// ============================================
// ALERT PIPELINE ORCHESTRATOR
// ============================================
// Runs the alert agents in sequence: Scanner -> Matcher
// Mirrors the pattern in pipeline.ts for the content pipeline.

export async function runAlertPipeline(
  triggeredBy: string = "cron",
): Promise<{ runId: string; status: AgentRunStatus }> {
  // ── Load configuration ──────────────────────────────────────────────
  let config;
  try {
    config = await loadConfig();
  } catch (err) {
    console.log("[AlertPipeline] Failed to load config – aborting");
    return { runId: "", status: "FAILED" };
  }

  if (!config.enabled) {
    console.log("[AlertPipeline] Pipeline is disabled – skipping run");
    return { runId: "", status: "COMPLETED" };
  }

  // ── Create AlertRun record ──────────────────────────────────────────
  let run;
  try {
    run = await db.alertRun.create({
      data: { triggeredBy, status: "RUNNING" },
    });
  } catch (err) {
    console.log("[AlertPipeline] Failed to create AlertRun record – aborting");
    return { runId: "", status: "FAILED" };
  }

  console.log(
    `[AlertPipeline] Started run ${run.id} (triggered by: ${triggeredBy})`,
  );

  // ── Tracking state ─────────────────────────────────────────────────
  let totalTokens = 0;
  let totalCost = 0;
  const errors: string[] = [];

  const isBudgetExceeded = (): boolean => totalCost > config.budgetLimitUsd;

  try {
    // ── 1. Alert Scanner ──────────────────────────────────────────────
    console.log("[AlertPipeline] Running Alert Scanner...");
    try {
      const scanner = await runAlertScanner(config.model);
      totalTokens += scanner.tokensUsed;
      totalCost += scanner.costUsd;

      await db.alertRun.update({
        where: { id: run.id },
        data: { alertsGenerated: scanner.data?.alertsCreated || 0 },
      });

      if (!scanner.success) {
        errors.push(`Scanner: ${scanner.error}`);
      }

      console.log(
        `[AlertPipeline] Scanner complete – ${scanner.data?.alertsCreated ?? 0} alerts created from ${scanner.data?.evidenceScanned ?? 0} evidence cards`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Scanner: ${message}`);
      console.log(`[AlertPipeline] Alert Scanner failed: ${message}`);
    }

    if (isBudgetExceeded()) {
      console.log(
        "[AlertPipeline] Budget limit exceeded after Scanner – stopping early",
      );
      return await finalizeAlertPipeline(
        run.id,
        totalTokens,
        totalCost,
        errors,
        "PARTIAL",
      );
    }

    // ── 2. Alert Matcher ──────────────────────────────────────────────
    console.log("[AlertPipeline] Running Alert Matcher...");
    try {
      const matcher = await runAlertMatcher();
      totalTokens += matcher.tokensUsed;
      totalCost += matcher.costUsd;

      await db.alertRun.update({
        where: { id: run.id },
        data: { alertsMatched: matcher.data?.matchesCreated || 0 },
      });

      if (!matcher.success) {
        errors.push(`Matcher: ${matcher.error}`);
      }

      console.log(
        `[AlertPipeline] Matcher complete – ${matcher.data?.matchesCreated ?? 0} matches from ${matcher.data?.alertsProcessed ?? 0} alerts`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Matcher: ${message}`);
      console.log(`[AlertPipeline] Alert Matcher failed: ${message}`);
    }
  } catch (err) {
    // Catch-all for any unexpected error
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`AlertPipeline: ${message}`);
    console.log(`[AlertPipeline] Unexpected error: ${message}`);
  }

  // ── 3. Determine final status ──────────────────────────────────────
  let finalStatus: AgentRunStatus;
  if (errors.length === 0) {
    finalStatus = "COMPLETED";
  } else if (errors.length < 3) {
    finalStatus = "PARTIAL";
  } else {
    finalStatus = "FAILED";
  }

  return await finalizeAlertPipeline(
    run.id,
    totalTokens,
    totalCost,
    errors,
    finalStatus,
  );
}

// ============================================
// HELPERS
// ============================================

async function finalizeAlertPipeline(
  runId: string,
  totalTokens: number,
  totalCost: number,
  errors: string[],
  status: AgentRunStatus,
): Promise<{ runId: string; status: AgentRunStatus }> {
  try {
    await db.alertRun.update({
      where: { id: runId },
      data: {
        status,
        totalTokensUsed: totalTokens,
        totalCostUsd: totalCost,
        errorLog: errors.length > 0 ? errors : undefined,
        completedAt: new Date(),
      },
    });
  } catch (err) {
    console.log(`[AlertPipeline] Failed to finalize run ${runId}: ${err}`);
  }

  console.log(
    `[AlertPipeline] Run ${runId} finished with status ${status} – tokens: ${totalTokens}, cost: $${totalCost.toFixed(4)}, errors: ${errors.length}`,
  );

  return { runId, status };
}
