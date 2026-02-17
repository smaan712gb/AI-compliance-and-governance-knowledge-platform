import { db } from "@/lib/db";
import { callDeepSeek, parseJsonResponse } from "./deepseek-client";
import { WRITER_SYSTEM_PROMPT, buildWriterUserPrompt } from "./prompts";
import type { AgentResult, WriterResult, WrittenArticle } from "./types";
import type { PipelineConfig } from "./types";

/**
 * Writer Agent
 *
 * Takes planned AgentTasks and generates full articles using DeepSeek.
 * Handles retries on JSON parse failures and tracks token usage/cost.
 */
export async function runWriterAgent(
  config: PipelineConfig,
  runId: string,
): Promise<AgentResult<WriterResult>> {
  let totalTokens = 0;
  let totalCost = 0;
  const writtenArticles: WrittenArticle[] = [];

  try {
    // 1. Fetch tasks that need writing (PLANNED or WRITING for rewrites)
    const tasks = await db.agentTask.findMany({
      where: {
        runId,
        status: { in: ["PLANNED", "WRITING"] },
      },
      include: {
        evidence: {
          include: {
            evidenceCard: true,
          },
        },
      },
    });

    if (tasks.length === 0) {
      return {
        success: true,
        data: { articlesWritten: 0, articles: [] },
        tokensUsed: 0,
        costUsd: 0,
      };
    }

    // 2. Fetch existing content slugs for internal linking suggestions
    const existingContent = await db.contentPage.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, type: true },
      take: 50,
    });
    const existingSlugs = existingContent.map(
      (c) => `${c.slug} (${c.type})`,
    );

    // 3. Process each task
    for (const task of tasks) {
      console.log(`[WriterAgent] Processing task ${task.id}: "${task.title}"`);

      try {
        // 3a. Build evidence texts from linked evidence cards
        const evidenceTexts = task.evidence
          .map((te) => {
            const card = te.evidenceCard;
            const findings = Array.isArray(card.keyFindings)
              ? (card.keyFindings as string[]).join("; ")
              : String(card.keyFindings);
            return `${card.summary}\nKey findings: ${findings}`;
          })
          .filter(Boolean);

        // 3b. Build the prompt, including QA feedback if this is a rewrite
        const qaFeedback = task.qaFeedback ?? undefined;

        const userPrompt = buildWriterUserPrompt(
          task.brief,
          evidenceTexts,
          task.targetKeywords,
          task.targetWordCount,
          task.type,
          existingSlugs,
          qaFeedback,
        );

        // 3c. Call DeepSeek
        let article: WrittenArticle | null = null;
        let parseAttempts = 0;
        const maxParseAttempts = 3; // Up to 3 attempts for robustness

        while (parseAttempts < maxParseAttempts && !article) {
          parseAttempts++;

          const result = await callDeepSeek({
            systemPrompt: WRITER_SYSTEM_PROMPT,
            userPrompt,
            model: config.model,
            jsonMode: true,
            temperature: config.writerTemperature,
            maxTokens: config.maxTokensPerArticle,
          });

          totalTokens += result.totalTokens;
          totalCost += result.costUsd;

          // 3d. Parse response as WrittenArticle
          try {
            const parsed = parseJsonResponse<Omit<WrittenArticle, "taskId">>(
              result.content,
            );
            article = {
              taskId: task.id,
              title: parsed.title,
              metaTitle: parsed.metaTitle,
              metaDescription: parsed.metaDescription,
              excerpt: parsed.excerpt,
              body: parsed.body,
              tags: parsed.tags || [],
              category: parsed.category || "ai-governance",
            };
          } catch (parseError) {
            console.error(
              `[WriterAgent] JSON parse failed for task ${task.id} (attempt ${parseAttempts}/${maxParseAttempts}):`,
              parseError instanceof Error
                ? parseError.message
                : String(parseError),
            );

            // If this was the last attempt, mark as REJECTED
            if (parseAttempts >= maxParseAttempts) {
              console.error(
                `[WriterAgent] Marking task ${task.id} as REJECTED after ${maxParseAttempts} parse failures`,
              );
              await db.agentTask.update({
                where: { id: task.id },
                data: {
                  status: "REJECTED",
                  qaFeedback: `Writer agent failed: Could not parse DeepSeek response as valid JSON after ${maxParseAttempts} attempts.`,
                },
              });
            }
          }
        }

        if (!article) {
          continue;
        }

        // 3e. Update the AgentTask with generated content
        await db.agentTask.update({
          where: { id: task.id },
          data: {
            generatedBody: article.body,
            generatedMeta: {
              title: article.title,
              metaTitle: article.metaTitle,
              metaDescription: article.metaDescription,
              excerpt: article.excerpt,
              tags: article.tags,
              category: article.category,
            },
            status: "IN_REVIEW",
          },
        });

        writtenArticles.push(article);
        console.log(
          `[WriterAgent] Successfully wrote article for task ${task.id}: "${article.title}"`,
        );
      } catch (taskError) {
        console.error(
          `[WriterAgent] Error processing task ${task.id}:`,
          taskError instanceof Error ? taskError.message : String(taskError),
        );
        // Continue with next task rather than failing the whole batch
      }
    }

    return {
      success: true,
      data: {
        articlesWritten: writtenArticles.length,
        articles: writtenArticles,
      },
      tokensUsed: totalTokens,
      costUsd: totalCost,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error(`[WriterAgent] Fatal error: ${message}`);

    return {
      success: false,
      error: message,
      data: {
        articlesWritten: writtenArticles.length,
        articles: writtenArticles,
      },
      tokensUsed: totalTokens,
      costUsd: totalCost,
    };
  }
}
