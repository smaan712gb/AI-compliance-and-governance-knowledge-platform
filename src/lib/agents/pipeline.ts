import { db } from "@/lib/db";
import { loadConfig } from "./config";
import { runResearchAgent } from "./research-agent";
import { runPlannerAgent } from "./planner-agent";
import { runWriterAgent } from "./writer-agent";
import { runQAAgent } from "./qa-agent";
import { runPublisherAgent } from "./publisher-agent";
import type { AgentRunStatus } from "@prisma/client";

// ============================================
// PIPELINE ORCHESTRATOR
// ============================================
// Runs all agents in sequence: Research -> Planner -> Writer -> QA -> Publisher
// Includes a rewrite loop for articles sent back by QA.

export async function runPipeline(
  triggeredBy: string = "cron",
): Promise<{ runId: string; status: AgentRunStatus }> {
  // ── Load configuration ──────────────────────────────────────────────
  let config;
  try {
    config = await loadConfig();
  } catch (err) {
    console.log("[Pipeline] Failed to load config – aborting");
    return { runId: "", status: "FAILED" };
  }

  if (!config.enabled) {
    console.log("[Pipeline] Pipeline is disabled – skipping run");
    return { runId: "", status: "COMPLETED" };
  }

  // ── Create AgentRun record ──────────────────────────────────────────
  let run;
  try {
    run = await db.agentRun.create({
      data: { triggeredBy, status: "RUNNING" },
    });
  } catch (err) {
    console.log("[Pipeline] Failed to create AgentRun record – aborting");
    return { runId: "", status: "FAILED" };
  }

  console.log(`[Pipeline] Started run ${run.id} (triggered by: ${triggeredBy})`);

  // ── Tracking state ─────────────────────────────────────────────────
  let totalTokens = 0;
  let totalCost = 0;
  const errors: string[] = [];

  // Helper: check whether we have exceeded the budget
  const isBudgetExceeded = (): boolean => totalCost > config.budgetLimitUsd;

  try {
    // ── 1. Research Agent ─────────────────────────────────────────────
    console.log("[Pipeline] Running Research Agent...");
    try {
      const research = await runResearchAgent(config);
      totalTokens += research.tokensUsed;
      totalCost += research.costUsd;

      await db.agentRun.update({
        where: { id: run.id },
        data: { researchCount: research.data?.newEvidenceCards || 0 },
      });

      if (!research.success) {
        errors.push(`Research: ${research.error}`);
      }

      console.log(
        `[Pipeline] Research complete – ${research.data?.newEvidenceCards ?? 0} new evidence cards`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Research: ${message}`);
      console.log(`[Pipeline] Research Agent failed: ${message}`);
    }

    if (isBudgetExceeded()) {
      console.log("[Pipeline] Budget limit exceeded after Research – stopping early");
      return await finalizePipeline(run.id, totalTokens, totalCost, errors, "PARTIAL");
    }

    // ── 2. Planner Agent ──────────────────────────────────────────────
    console.log("[Pipeline] Running Planner Agent...");
    try {
      const planner = await runPlannerAgent(config, run.id);
      totalTokens += planner.tokensUsed;
      totalCost += planner.costUsd;

      await db.agentRun.update({
        where: { id: run.id },
        data: { tasksPlanned: planner.data?.tasksCreated || 0 },
      });

      if (!planner.success) {
        errors.push(`Planner: ${planner.error}`);
      }

      console.log(
        `[Pipeline] Planner complete – ${planner.data?.tasksCreated ?? 0} tasks planned`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Planner: ${message}`);
      console.log(`[Pipeline] Planner Agent failed: ${message}`);
    }

    if (isBudgetExceeded()) {
      console.log("[Pipeline] Budget limit exceeded after Planner – stopping early");
      return await finalizePipeline(run.id, totalTokens, totalCost, errors, "PARTIAL");
    }

    // ── 3. Writer Agent ───────────────────────────────────────────────
    console.log("[Pipeline] Running Writer Agent...");
    try {
      const writer = await runWriterAgent(config, run.id);
      totalTokens += writer.tokensUsed;
      totalCost += writer.costUsd;

      await db.agentRun.update({
        where: { id: run.id },
        data: { articlesWritten: writer.data?.articlesWritten || 0 },
      });

      if (!writer.success) {
        errors.push(`Writer: ${writer.error}`);
      }

      console.log(
        `[Pipeline] Writer complete – ${writer.data?.articlesWritten ?? 0} articles written`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Writer: ${message}`);
      console.log(`[Pipeline] Writer Agent failed: ${message}`);
    }

    if (isBudgetExceeded()) {
      console.log("[Pipeline] Budget limit exceeded after Writer – stopping early");
      return await finalizePipeline(run.id, totalTokens, totalCost, errors, "PARTIAL");
    }

    // ── 4. QA Agent ───────────────────────────────────────────────────
    console.log("[Pipeline] Running QA Agent...");
    try {
      const qa = await runQAAgent(config, run.id);
      totalTokens += qa.tokensUsed;
      totalCost += qa.costUsd;

      await db.agentRun.update({
        where: { id: run.id },
        data: { articlesApproved: qa.data?.approved || 0 },
      });

      if (!qa.success) {
        errors.push(`QA: ${qa.error}`);
      }

      console.log(
        `[Pipeline] QA complete – ${qa.data?.approved ?? 0} approved, ${qa.data?.sentBack ?? 0} sent back`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`QA: ${message}`);
      console.log(`[Pipeline] QA Agent failed: ${message}`);
    }

    if (isBudgetExceeded()) {
      console.log("[Pipeline] Budget limit exceeded after QA – stopping early");
      return await finalizePipeline(run.id, totalTokens, totalCost, errors, "PARTIAL");
    }

    // ── 5. Rewrite Loop ──────────────────────────────────────────────
    for (let attempt = 0; attempt < config.maxRewriteAttempts; attempt++) {
      // Check if any tasks were sent back to WRITING by the QA Agent
      const tasksNeedingRewrite = await db.agentTask.count({
        where: { runId: run.id, status: "WRITING" },
      });

      if (tasksNeedingRewrite === 0) {
        console.log("[Pipeline] No articles need rewriting – skipping rewrite loop");
        break;
      }

      console.log(
        `[Pipeline] Rewrite attempt ${attempt + 1}/${config.maxRewriteAttempts} – ${tasksNeedingRewrite} articles to rewrite`,
      );

      // Re-run Writer Agent for tasks sent back
      try {
        const rewrite = await runWriterAgent(config, run.id);
        totalTokens += rewrite.tokensUsed;
        totalCost += rewrite.costUsd;

        if (!rewrite.success) {
          errors.push(`Rewrite Writer (attempt ${attempt + 1}): ${rewrite.error}`);
        }

        console.log(
          `[Pipeline] Rewrite Writer complete – ${rewrite.data?.articlesWritten ?? 0} articles rewritten`,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Rewrite Writer (attempt ${attempt + 1}): ${message}`);
        console.log(`[Pipeline] Rewrite Writer failed: ${message}`);
      }

      if (isBudgetExceeded()) {
        console.log("[Pipeline] Budget limit exceeded during rewrite loop – stopping early");
        return await finalizePipeline(run.id, totalTokens, totalCost, errors, "PARTIAL");
      }

      // Re-run QA Agent on the rewritten articles
      try {
        const rewriteQA = await runQAAgent(config, run.id);
        totalTokens += rewriteQA.tokensUsed;
        totalCost += rewriteQA.costUsd;

        if (!rewriteQA.success) {
          errors.push(`Rewrite QA (attempt ${attempt + 1}): ${rewriteQA.error}`);
        }

        console.log(
          `[Pipeline] Rewrite QA complete – ${rewriteQA.data?.approved ?? 0} approved, ${rewriteQA.data?.sentBack ?? 0} sent back`,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Rewrite QA (attempt ${attempt + 1}): ${message}`);
        console.log(`[Pipeline] Rewrite QA failed: ${message}`);
      }

      if (isBudgetExceeded()) {
        console.log("[Pipeline] Budget limit exceeded during rewrite loop – stopping early");
        return await finalizePipeline(run.id, totalTokens, totalCost, errors, "PARTIAL");
      }
    }

    // ── 6. Publisher Agent ────────────────────────────────────────────
    console.log("[Pipeline] Running Publisher Agent...");
    try {
      const publisher = await runPublisherAgent(config, run.id);
      totalTokens += publisher.tokensUsed;
      totalCost += publisher.costUsd;

      await db.agentRun.update({
        where: { id: run.id },
        data: { articlesPublished: publisher.data?.published || 0 },
      });

      if (!publisher.success) {
        errors.push(`Publisher: ${publisher.error}`);
      }

      console.log(
        `[Pipeline] Publisher complete – ${publisher.data?.published ?? 0} articles published`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Publisher: ${message}`);
      console.log(`[Pipeline] Publisher Agent failed: ${message}`);
    }
  } catch (err) {
    // Catch-all for any unexpected error that slipped through
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`Pipeline: ${message}`);
    console.log(`[Pipeline] Unexpected error: ${message}`);
  }

  // ── 7. Determine final status ──────────────────────────────────────
  let finalStatus: AgentRunStatus;
  if (errors.length === 0) {
    finalStatus = "COMPLETED";
  } else if (errors.length < 5) {
    // Some agents succeeded – treat as partial
    finalStatus = "PARTIAL";
  } else {
    finalStatus = "FAILED";
  }

  return await finalizePipeline(run.id, totalTokens, totalCost, errors, finalStatus);
}

// ============================================
// HELPERS
// ============================================

async function finalizePipeline(
  runId: string,
  totalTokens: number,
  totalCost: number,
  errors: string[],
  status: AgentRunStatus,
): Promise<{ runId: string; status: AgentRunStatus }> {
  try {
    await db.agentRun.update({
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
    console.log(`[Pipeline] Failed to finalize run ${runId}: ${err}`);
  }

  console.log(
    `[Pipeline] Run ${runId} finished with status ${status} – tokens: ${totalTokens}, cost: $${totalCost.toFixed(4)}, errors: ${errors.length}`,
  );

  return { runId, status };
}
