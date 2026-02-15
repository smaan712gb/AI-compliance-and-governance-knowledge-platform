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

            // Extract and truncate content to avoid excessive token usage
            const rawContent = stripHtml(extractContent(item));
            const truncatedContent = rawContent.slice(0, 6000);

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
