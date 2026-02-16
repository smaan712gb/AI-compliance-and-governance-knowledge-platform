import { db } from "@/lib/db";
import { callDeepSeek, parseJsonResponse } from "./deepseek-client";
import { PLANNER_SYSTEM_PROMPT, buildPlannerUserPrompt } from "./prompts";
import type { AgentResult, PlannerResult, ContentBrief } from "./types";
import type { PipelineConfig } from "./types";

// ============================================
// SLUG UTILITIES
// ============================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ""); // Trim leading/trailing hyphens
}

// ============================================
// PLANNER AGENT
// ============================================

export async function runPlannerAgent(
  config: PipelineConfig,
  runId: string,
): Promise<AgentResult<PlannerResult>> {
  let totalTokens = 0;
  let totalCost = 0;

  try {
    // 1. Fetch unused evidence cards with sufficient relevance
    const evidenceCards = await db.evidenceCard.findMany({
      where: {
        isUsed: false,
        relevanceScore: { gte: 0.5 },
      },
      orderBy: { relevanceScore: "desc" },
      take: 30,
    });

    // 2. Not enough material to plan content
    if (evidenceCards.length < 3) {
      return {
        success: true,
        data: {
          tasksCreated: 0,
          briefs: [],
        },
        tokensUsed: 0,
        costUsd: 0,
      };
    }

    // 3. Fetch recent content titles to avoid duplicates (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const existingContent = await db.contentPage.findMany({
      where: {
        createdAt: { gte: ninetyDaysAgo },
      },
      select: { title: true, slug: true },
    });

    const existingTitles = existingContent.map((c) => c.title);

    // 4. Fetch published vendor names for comparisons/best-of
    const vendors = await db.vendor.findMany({
      where: { isPublished: true },
      select: { name: true, slug: true },
    });

    const vendorNames = vendors.map((v) => v.name);

    // 5. Call DeepSeek for content planning
    const evidenceForPrompt = evidenceCards.map((ec) => ({
      id: ec.id,
      title: ec.title,
      summary: ec.summary,
      category: ec.category,
      tags: ec.tags,
    }));

    const result = await callDeepSeek({
      systemPrompt: PLANNER_SYSTEM_PROMPT,
      userPrompt: buildPlannerUserPrompt(
        evidenceForPrompt,
        existingTitles,
        vendorNames,
        config.dailyArticleTarget,
      ),
      model: config.plannerModel,
      jsonMode: true,
      maxTokens: 3000,
    });

    totalTokens += result.totalTokens;
    totalCost += result.costUsd;

    // Log reasoning chain if available (deep thinking mode)
    if (result.reasoningContent) {
      console.log(
        `[PlannerAgent] Reasoning (${result.reasoningTokens} tokens, model: ${result.modelUsed}):\n${result.reasoningContent.slice(0, 500)}...`,
      );
    }

    // 6. Parse response
    const parsed = parseJsonResponse<{ briefs: ContentBrief[] }>(
      result.content,
    );

    const briefs = parsed.briefs || [];

    // Build a set of valid evidence card IDs for validation
    const validEvidenceIds = new Set(evidenceCards.map((ec) => ec.id));
    const usedEvidenceIds = new Set<string>();
    const createdBriefs: ContentBrief[] = [];

    // 7. Create AgentTask records for each brief
    for (const brief of briefs) {
      try {
        // Slugify and validate the slug
        const slug = slugify(brief.slug || brief.title);

        if (!slug) continue;

        // Validate that referenced evidence card IDs actually exist
        const validatedEvidenceIds = (brief.evidenceCardIds || []).filter(
          (id) => validEvidenceIds.has(id),
        );

        // Create the AgentTask
        const task = await db.agentTask.create({
          data: {
            type: brief.type,
            title: brief.title,
            slug,
            brief: brief.brief,
            targetKeywords: brief.targetKeywords || [],
            targetWordCount: brief.targetWordCount || 1500,
            priority: Math.max(1, Math.min(10, brief.priority || 5)),
            status: "PLANNED",
            runId,
          },
        });

        // 8. Create AgentTaskEvidence records linking task to evidence cards
        for (const evidenceCardId of validatedEvidenceIds) {
          await db.agentTaskEvidence.create({
            data: {
              taskId: task.id,
              evidenceCardId,
            },
          });
          usedEvidenceIds.add(evidenceCardId);
        }

        createdBriefs.push({
          ...brief,
          slug,
          evidenceCardIds: validatedEvidenceIds,
        });
      } catch (briefError) {
        // Log and continue -- a single brief failure shouldn't stop others
        console.error(
          `Failed to create task for brief "${brief.title}":`,
          briefError instanceof Error ? briefError.message : briefError,
        );
      }
    }

    // 9. Mark used evidence cards
    if (usedEvidenceIds.size > 0) {
      await db.evidenceCard.updateMany({
        where: {
          id: { in: Array.from(usedEvidenceIds) },
        },
        data: { isUsed: true },
      });
    }

    return {
      success: true,
      data: {
        tasksCreated: createdBriefs.length,
        briefs: createdBriefs,
      },
      tokensUsed: totalTokens,
      costUsd: totalCost,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Planner agent failed: ${message}`,
      data: {
        tasksCreated: 0,
        briefs: [],
      },
      tokensUsed: totalTokens,
      costUsd: totalCost,
    };
  }
}
