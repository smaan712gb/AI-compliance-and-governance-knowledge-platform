import { db } from "@/lib/db";
import { callDeepSeek, parseJsonResponse } from "./deepseek-client";
import { PUBLISHER_SYSTEM_PROMPT, buildPublisherUserPrompt } from "./prompts";
import type { AgentResult, PublishResult, SocialPost } from "./types";
import type { PipelineConfig } from "./types";
import { TASK_TYPE_TO_CONTENT_TYPE } from "./types";

/**
 * Publisher Agent
 *
 * Publishes approved AgentTasks as ContentPage records and generates
 * social media draft posts for each published article.
 */

/**
 * Resolve a unique slug by appending a numeric suffix if a conflict exists.
 */
async function resolveUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let suffix = 1;

  while (true) {
    const existing = await db.contentPage.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    suffix++;
    slug = `${baseSlug}-${suffix}`;
  }
}

export async function runPublisherAgent(
  config: PipelineConfig,
  runId: string,
): Promise<AgentResult<PublishResult>> {
  let totalTokens = 0;
  let totalCost = 0;
  let publishedCount = 0;
  let socialPostsCreated = 0;

  try {
    // 1. Fetch approved tasks
    const tasks = await db.agentTask.findMany({
      where: {
        runId,
        status: "APPROVED",
      },
    });

    if (tasks.length === 0) {
      return {
        success: true,
        data: { published: 0, socialPostsCreated: 0 },
        tokensUsed: 0,
        costUsd: 0,
      };
    }

    // 2. Process each approved task
    for (const task of tasks) {
      console.log(`[PublisherAgent] Publishing task ${task.id}: "${task.title}"`);

      try {
        // 2a. Parse generatedMeta
        const meta = task.generatedMeta as Record<string, unknown> | null;
        if (!meta || !task.generatedBody) {
          console.error(
            `[PublisherAgent] Task ${task.id} missing generated content, skipping`,
          );
          continue;
        }

        const title = (meta.title as string) || task.title;
        const metaTitle = (meta.metaTitle as string) || title;
        const metaDescription = (meta.metaDescription as string) || "";
        const excerpt = (meta.excerpt as string) || "";
        const tags = (meta.tags as string[]) || [];
        const category = (meta.category as string) || "ai-governance";

        // 2b. Map task type to ContentType
        const contentType = TASK_TYPE_TO_CONTENT_TYPE[task.type];

        // 2c. Resolve a unique slug (handle conflicts)
        const uniqueSlug = await resolveUniqueSlug(task.slug);

        // 2d. Use a Prisma transaction to create ContentPage + update AgentTask atomically
        const contentPage = await db.$transaction(async (tx) => {
          const page = await tx.contentPage.create({
            data: {
              title,
              slug: uniqueSlug,
              type: contentType,
              body: task.generatedBody!,
              excerpt: excerpt || null,
              metaTitle: metaTitle || null,
              metaDescription: metaDescription || null,
              tags,
              category,
              status: "PUBLISHED",
              publishedAt: new Date(),
              agentGenerated: true,
              author: "AIGovHub Editorial",
            },
          });

          await tx.agentTask.update({
            where: { id: task.id },
            data: {
              contentPageId: page.id,
              status: "PUBLISHED",
            },
          });

          return page;
        });

        publishedCount++;
        console.log(
          `[PublisherAgent] Published "${title}" as ContentPage ${contentPage.id} (slug: ${uniqueSlug})`,
        );

        // 2e. Generate social media posts (wrapped in try-catch to not fail the whole publish)
        try {
          const socialResult = await callDeepSeek({
            systemPrompt: PUBLISHER_SYSTEM_PROMPT,
            userPrompt: buildPublisherUserPrompt(title, excerpt, uniqueSlug),
            jsonMode: true,
          });

          totalTokens += socialResult.totalTokens;
          totalCost += socialResult.costUsd;

          // 2f. Parse social posts
          const parsed = parseJsonResponse<{ posts: SocialPost[] }>(
            socialResult.content,
          );

          if (parsed.posts && Array.isArray(parsed.posts)) {
            // 2g. Create SocialPostDraft records
            for (const post of parsed.posts) {
              await db.socialPostDraft.create({
                data: {
                  taskId: task.id,
                  platform: post.platform,
                  content: post.content,
                  hashtags: post.hashtags || [],
                  status: "DRAFT",
                },
              });
              socialPostsCreated++;
            }

            console.log(
              `[PublisherAgent] Created ${parsed.posts.length} social post drafts for task ${task.id}`,
            );
          }
        } catch (socialError) {
          // Don't fail the whole publish if social post generation fails
          console.error(
            `[PublisherAgent] Social post generation failed for task ${task.id}:`,
            socialError instanceof Error
              ? socialError.message
              : String(socialError),
          );
        }
      } catch (taskError) {
        console.error(
          `[PublisherAgent] Error publishing task ${task.id}:`,
          taskError instanceof Error ? taskError.message : String(taskError),
        );
        // Continue with next task rather than failing the whole batch
      }
    }

    return {
      success: true,
      data: {
        published: publishedCount,
        socialPostsCreated,
      },
      tokensUsed: totalTokens,
      costUsd: totalCost,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error(`[PublisherAgent] Fatal error: ${message}`);

    return {
      success: false,
      error: message,
      data: {
        published: publishedCount,
        socialPostsCreated,
      },
      tokensUsed: totalTokens,
      costUsd: totalCost,
    };
  }
}
