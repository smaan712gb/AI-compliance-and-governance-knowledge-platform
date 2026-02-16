import { db } from "@/lib/db";
import { callDeepSeek, parseJsonResponse } from "./deepseek-client";
import { RESEARCH_SYSTEM_PROMPT, buildResearchUserPrompt } from "./prompts";
import type { AgentResult, ResearchResult, ResearchFinding } from "./types";
import type { PipelineConfig } from "./types";
import { XMLParser } from "fast-xml-parser";

// ============================================
// RSS ITEM NORMALIZATION
// ============================================

interface RawRSSItem {
  title?: string;
  link?: string | { "@_href"?: string; "#text"?: string };
  description?: string;
  "content:encoded"?: string;
  content?: string | { "#text"?: string };
  pubDate?: string;
  published?: string;
  updated?: string;
  id?: string;
  guid?: string | { "#text"?: string };
}

function normalizeLink(
  link: string | { "@_href"?: string; "#text"?: string } | undefined,
  baseUrl: string,
): string {
  if (!link) return "";

  let href: string;
  if (typeof link === "string") {
    href = link;
  } else {
    href = link["@_href"] || link["#text"] || "";
  }

  href = href.trim();

  // Handle relative URLs
  if (href && !href.startsWith("http://") && !href.startsWith("https://")) {
    try {
      const base = new URL(baseUrl);
      href = new URL(href, base.origin).toString();
    } catch {
      // If URL construction fails, return as-is
    }
  }

  return href;
}

function extractContent(item: RawRSSItem): string {
  // Prefer content:encoded (full HTML), then content, then description
  if (item["content:encoded"]) return item["content:encoded"];
  if (typeof item.content === "string") return item.content;
  if (typeof item.content === "object" && item.content?.["#text"]) {
    return item.content["#text"];
  }
  return item.description || "";
}

function extractTitle(item: RawRSSItem): string {
  return (typeof item.title === "string" ? item.title : "") || "Untitled";
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fetch the full article content from a URL when RSS content is thin.
 * Falls back to empty string on failure (caller uses RSS content instead).
 */
async function fetchFullArticleContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "AIGovHub Research Agent/1.0",
        Accept: "text/html, application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return "";

    const html = await response.text();

    // Extract main content area — look for <article>, <main>, or fall back to full body
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);

    let content: string;
    if (articleMatch) {
      content = articleMatch[1];
    } else if (mainMatch) {
      content = mainMatch[1];
    } else {
      content = html;
    }

    return stripHtml(content).slice(0, 12000);
  } catch {
    return "";
  }
}

// ============================================
// RESEARCH AGENT
// ============================================

export async function runResearchAgent(
  config: PipelineConfig,
): Promise<AgentResult<ResearchResult>> {
  const errors: string[] = [];
  let newEvidenceCards = 0;
  let sourcesProcessed = 0;
  let totalTokens = 0;
  let totalCost = 0;

  try {
    // 1. Query active sources that are due for fetching
    const now = new Date();
    const sources = await db.agentSource.findMany({
      where: {
        isActive: true,
        OR: [
          { lastFetchedAt: null },
          {
            lastFetchedAt: {
              lt: new Date(
                now.getTime() -
                  // Use per-source interval; filter after fetch since
                  // Prisma can't reference own fields in where clause
                  24 * 60 * 60 * 1000,
              ),
            },
          },
        ],
      },
      take: config.researchSourceLimit,
    });

    // Further filter sources by their individual fetchIntervalHours
    const dueSources = sources.filter((source) => {
      if (!source.lastFetchedAt) return true;
      const intervalMs = source.fetchIntervalHours * 60 * 60 * 1000;
      return now.getTime() - source.lastFetchedAt.getTime() >= intervalMs;
    });

    const parser = new XMLParser({
      ignoreAttributes: false,
      isArray: (name) => name === "item" || name === "entry",
    });

    // 2. Process each source
    for (const source of dueSources) {
      try {
        // Fetch RSS feed
        const response = await fetch(source.url, {
          headers: {
            "User-Agent": "AIGovHub Research Agent/1.0",
            Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          errors.push(
            `Source "${source.name}" returned HTTP ${response.status}`,
          );
          continue;
        }

        const xml = await response.text();
        const parsed = parser.parse(xml);

        // 3. Handle RSS 2.0 and Atom feed formats
        let items: RawRSSItem[] = [];

        if (parsed?.rss?.channel?.item) {
          // RSS 2.0
          items = Array.isArray(parsed.rss.channel.item)
            ? parsed.rss.channel.item
            : [parsed.rss.channel.item];
        } else if (parsed?.feed?.entry) {
          // Atom
          items = Array.isArray(parsed.feed.entry)
            ? parsed.feed.entry
            : [parsed.feed.entry];
        } else if (parsed?.["rdf:RDF"]?.item) {
          // RSS 1.0 / RDF
          items = Array.isArray(parsed["rdf:RDF"].item)
            ? parsed["rdf:RDF"].item
            : [parsed["rdf:RDF"].item];
        }

        // 4. Process each RSS item
        for (const item of items) {
          try {
            const title = extractTitle(item);
            const link = normalizeLink(item.link, source.url);

            if (!link) continue;

            // Check if URL already exists in EvidenceCard table
            const existing = await db.evidenceCard.findFirst({
              where: { url: link },
            });

            if (existing) continue;

            // Extract content from RSS, attempt to fetch full article if thin
            const rssContent = stripHtml(extractContent(item));
            let articleContent = rssContent;

            // If RSS content is thin (< 1000 chars), try fetching the full article
            if (rssContent.length < 1000 && link) {
              const fullContent = await fetchFullArticleContent(link);
              if (fullContent.length > rssContent.length) {
                articleContent = fullContent;
              }
            }

            const truncatedContent = articleContent.slice(0, 12000);

            if (!truncatedContent || truncatedContent.length < 50) continue;

            // Call DeepSeek for structured analysis
            const result = await callDeepSeek({
              systemPrompt: RESEARCH_SYSTEM_PROMPT,
              userPrompt: buildResearchUserPrompt(title, truncatedContent),
              model: config.model,
              jsonMode: true,
              maxTokens: 1000,
            });

            totalTokens += result.totalTokens;
            totalCost += result.costUsd;

            // Parse the structured response
            const finding = parseJsonResponse<ResearchFinding>(result.content);

            // Create EvidenceCard in database
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + config.evidenceExpiryDays);

            await db.evidenceCard.create({
              data: {
                sourceId: source.id,
                title: finding.title || title,
                url: link,
                summary: finding.summary,
                keyFindings: finding.keyFindings,
                relevanceScore: Math.max(
                  0,
                  Math.min(1, finding.relevanceScore),
                ),
                category: finding.category,
                tags: finding.tags || [],
                rawContent: truncatedContent,
                expiresAt,
              },
            });

            newEvidenceCards++;
          } catch (itemError) {
            const message =
              itemError instanceof Error
                ? itemError.message
                : String(itemError);
            errors.push(
              `Item error in source "${source.name}": ${message}`,
            );
            // Continue to next item
          }
        }

        // 5. Update source lastFetchedAt
        await db.agentSource.update({
          where: { id: source.id },
          data: { lastFetchedAt: new Date() },
        });

        sourcesProcessed++;
      } catch (sourceError) {
        const message =
          sourceError instanceof Error
            ? sourceError.message
            : String(sourceError);
        errors.push(`Source "${source.name}" failed: ${message}`);
        // Continue to next source
      }
    }

    // 6. Cross-reference newly created evidence cards
    // Boost relevance when multiple sources corroborate the same topic
    if (newEvidenceCards >= 2) {
      try {
        const recentCards = await db.evidenceCard.findMany({
          where: {
            createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
            isUsed: false,
          },
          select: { id: true, title: true, category: true, tags: true, relevanceScore: true },
        });

        const categoryGroups = new Map<string, typeof recentCards>();
        for (const card of recentCards) {
          const group = categoryGroups.get(card.category) || [];
          group.push(card);
          categoryGroups.set(card.category, group);
        }

        for (const [, cards] of categoryGroups) {
          if (cards.length < 2) continue;

          for (let i = 0; i < cards.length; i++) {
            for (let j = i + 1; j < cards.length; j++) {
              const tagsA = new Set(cards[i].tags);
              const commonTags = cards[j].tags.filter((t) => tagsA.has(t));

              if (commonTags.length >= 2) {
                const boost = Math.min(0.15, commonTags.length * 0.05);
                for (const card of [cards[i], cards[j]]) {
                  const newScore = Math.min(1.0, card.relevanceScore + boost);
                  if (newScore > card.relevanceScore) {
                    await db.evidenceCard.update({
                      where: { id: card.id },
                      data: { relevanceScore: newScore },
                    });
                  }
                }
              }
            }
          }
        }

        console.log(
          `[ResearchAgent] Cross-reference complete for ${recentCards.length} evidence cards`,
        );
      } catch (crossRefError) {
        console.warn(
          "[ResearchAgent] Cross-reference step failed:",
          crossRefError instanceof Error ? crossRefError.message : String(crossRefError),
        );
      }
    }

    return {
      success: true,
      data: {
        newEvidenceCards,
        sourcesProcessed,
        errors,
      },
      tokensUsed: totalTokens,
      costUsd: totalCost,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Research agent failed: ${message}`,
      data: {
        newEvidenceCards,
        sourcesProcessed,
        errors: [...errors, message],
      },
      tokensUsed: totalTokens,
      costUsd: totalCost,
    };
  }
}
