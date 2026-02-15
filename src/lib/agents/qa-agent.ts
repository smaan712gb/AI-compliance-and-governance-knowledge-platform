import { db } from "@/lib/db";
import { callDeepSeek, parseJsonResponse } from "./deepseek-client";
import { QA_SYSTEM_PROMPT, buildQAUserPrompt } from "./prompts";
import type { AgentResult, QAResult, QAReport, QAScores } from "./types";
import type { PipelineConfig } from "./types";

/**
 * QA Agent
 *
 * Reviews written articles, scores them on 8 dimensions,
 * and approves, rejects, or sends back for rewrite based on configured thresholds.
 */

const SCORE_DIMENSIONS: (keyof QAScores)[] = [
  "accuracy",
  "seoOptimization",
  "readability",
  "completeness",
  "originality",
  "ctaEffectiveness",
  "complianceExpertise",
  "professionalTone",
];

/**
 * Clamp a score value to the valid 1-10 range.
 */
function clampScore(value: number): number {
  return Math.max(1, Math.min(10, Math.round(value)));
}

/**
 * Validate and normalize QA scores, ensuring all 8 dimensions are present
 * and values are clamped to the 1-10 range.
 */
function validateScores(rawScores: Partial<QAScores>): QAScores | null {
  const validated: Partial<QAScores> = {};

  for (const dimension of SCORE_DIMENSIONS) {
    const value = rawScores[dimension];
    if (value === undefined || value === null || typeof value !== "number") {
      return null; // Missing dimension
    }
    validated[dimension] = clampScore(value);
  }

  return validated as QAScores;
}

/**
 * Calculate the average score from validated QAScores.
 * We compute this ourselves rather than trusting DeepSeek's calculation.
 */
function calculateAverageScore(scores: QAScores): number {
  const total = SCORE_DIMENSIONS.reduce(
    (sum, dim) => sum + scores[dim],
    0,
  );
  return parseFloat((total / SCORE_DIMENSIONS.length).toFixed(2));
}

export async function runQAAgent(
  config: PipelineConfig,
  runId: string,
): Promise<AgentResult<QAResult>> {
  let totalTokens = 0;
  let totalCost = 0;
  const reports: QAReport[] = [];
  let approvedCount = 0;
  let sentBackCount = 0;
  let rejectedCount = 0;

  try {
    // 1. Fetch tasks that are in review
    const tasks = await db.agentTask.findMany({
      where: {
        runId,
        status: "IN_REVIEW",
      },
    });

    if (tasks.length === 0) {
      return {
        success: true,
        data: {
          reviewed: 0,
          approved: 0,
          sentBack: 0,
          rejected: 0,
          reports: [],
        },
        tokensUsed: 0,
        costUsd: 0,
      };
    }

    // 2. Process each task
    for (const task of tasks) {
      console.log(`[QAAgent] Reviewing task ${task.id}: "${task.title}"`);

      try {
        // 2a. Parse generatedMeta to get title, metaTitle, metaDescription
        const meta = task.generatedMeta as Record<string, unknown> | null;
        if (!meta || !task.generatedBody) {
          console.error(
            `[QAAgent] Task ${task.id} missing generated content, skipping`,
          );
          continue;
        }

        const articleForReview = {
          title: (meta.title as string) || task.title,
          body: task.generatedBody,
          metaTitle: (meta.metaTitle as string) || "",
          metaDescription: (meta.metaDescription as string) || "",
        };

        // 2b. Call DeepSeek for QA review
        const result = await callDeepSeek({
          systemPrompt: QA_SYSTEM_PROMPT,
          userPrompt: buildQAUserPrompt(
            articleForReview,
            task.brief,
            task.targetKeywords,
          ),
          jsonMode: true,
        });

        totalTokens += result.totalTokens;
        totalCost += result.costUsd;

        // 2c. Parse and validate the QA report
        const rawReport = parseJsonResponse<{
          scores: Partial<QAScores>;
          averageScore?: number;
          feedback: string;
          suggestions: string[];
        }>(result.content);

        // 2d. Validate all 8 score dimensions are present
        const validatedScores = validateScores(rawReport.scores);
        if (!validatedScores) {
          console.error(
            `[QAAgent] Task ${task.id}: Invalid scores - missing dimensions. Raw scores:`,
            JSON.stringify(rawReport.scores),
          );
          // Treat as a low score to trigger rewrite
          await db.agentTask.update({
            where: { id: task.id },
            data: {
              qaFeedback:
                "QA scoring failed: DeepSeek returned incomplete score dimensions. Sending back for rewrite.",
              status:
                task.rewriteCount < config.maxRewriteAttempts
                  ? "WRITING"
                  : "REJECTED",
              rewriteCount: { increment: 1 },
            },
          });

          if (task.rewriteCount < config.maxRewriteAttempts) {
            sentBackCount++;
          } else {
            rejectedCount++;
          }
          continue;
        }

        // 2e. Calculate average score ourselves (don't trust DeepSeek's calculation)
        const averageScore = calculateAverageScore(validatedScores);

        const report: QAReport = {
          taskId: task.id,
          scores: validatedScores,
          averageScore,
          approved: averageScore >= config.minQAScore,
          feedback: rawReport.feedback || "",
          suggestions: rawReport.suggestions || [],
        };

        reports.push(report);

        // 2f. Decision logic
        if (averageScore >= config.minQAScore) {
          // APPROVED
          await db.agentTask.update({
            where: { id: task.id },
            data: {
              status: "APPROVED",
              qaScore: averageScore,
              qaFeedback: rawReport.feedback,
            },
          });
          approvedCount++;
          console.log(
            `[QAAgent] Task ${task.id} APPROVED with score ${averageScore}`,
          );
        } else if (task.rewriteCount < config.maxRewriteAttempts) {
          // SEND BACK FOR REWRITE
          const combinedFeedback = [
            rawReport.feedback,
            ...(rawReport.suggestions || []),
          ]
            .filter(Boolean)
            .join("\n- ");

          await db.agentTask.update({
            where: { id: task.id },
            data: {
              status: "WRITING",
              qaScore: averageScore,
              qaFeedback: combinedFeedback,
              rewriteCount: { increment: 1 },
            },
          });
          sentBackCount++;
          console.log(
            `[QAAgent] Task ${task.id} sent back for rewrite (score: ${averageScore}, rewrite #${task.rewriteCount + 1})`,
          );
        } else {
          // REJECTED - exceeded max rewrite attempts
          await db.agentTask.update({
            where: { id: task.id },
            data: {
              status: "REJECTED",
              qaScore: averageScore,
              qaFeedback: `Rejected after ${config.maxRewriteAttempts} rewrite attempts. Last feedback: ${rawReport.feedback}`,
            },
          });
          rejectedCount++;
          console.log(
            `[QAAgent] Task ${task.id} REJECTED after ${config.maxRewriteAttempts} rewrites (score: ${averageScore})`,
          );
        }
      } catch (taskError) {
        console.error(
          `[QAAgent] Error reviewing task ${task.id}:`,
          taskError instanceof Error ? taskError.message : String(taskError),
        );
        // Continue with next task rather than failing the whole batch
      }
    }

    return {
      success: true,
      data: {
        reviewed: reports.length,
        approved: approvedCount,
        sentBack: sentBackCount,
        rejected: rejectedCount,
        reports,
      },
      tokensUsed: totalTokens,
      costUsd: totalCost,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error(`[QAAgent] Fatal error: ${message}`);

    return {
      success: false,
      error: message,
      data: {
        reviewed: reports.length,
        approved: approvedCount,
        sentBack: sentBackCount,
        rejected: rejectedCount,
        reports,
      },
      tokensUsed: totalTokens,
      costUsd: totalCost,
    };
  }
}
