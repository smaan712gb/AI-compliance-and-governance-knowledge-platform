import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Seed agent sources and default settings.
 * Admin-only. Idempotent — safe to call multiple times.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (
      !session?.user?.role ||
      !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Agent Sources ─────────────────────────────────────────────────
    const agentSources = [
      { name: "EU AI Act Official", url: "https://artificialintelligenceact.eu/feed/", type: "REGULATORY_BODY" as const, category: "regulation" },
      { name: "NIST AI", url: "https://www.nist.gov/artificial-intelligence/rss.xml", type: "REGULATORY_BODY" as const, category: "framework-update" },
      { name: "MIT Technology Review - AI", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed", type: "RSS_FEED" as const, category: "research" },
      { name: "TechCrunch - AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/", type: "RSS_FEED" as const, category: "vendor-news" },
      { name: "The Verge - AI", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", type: "RSS_FEED" as const, category: "vendor-news" },
      { name: "OECD AI Policy Observatory", url: "https://oecd.ai/en/feed", type: "REGULATORY_BODY" as const, category: "regulation" },
      { name: "ICO UK Blog", url: "https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/rss/", type: "REGULATORY_BODY" as const, category: "regulation" },
      { name: "OneTrust Blog", url: "https://www.onetrust.com/blog/feed/", type: "RSS_FEED" as const, category: "vendor-news" },
      { name: "IAPP - Privacy", url: "https://iapp.org/rss/", type: "INDUSTRY_REPORT" as const, category: "best-practice" },
      { name: "Brookings - AI", url: "https://www.brookings.edu/topic/artificial-intelligence/feed/", type: "RESEARCH_PAPER" as const, category: "research" },
      { name: "Stanford HAI", url: "https://hai.stanford.edu/news/rss.xml", type: "RESEARCH_PAPER" as const, category: "research" },
      { name: "VentureBeat - AI", url: "https://venturebeat.com/category/ai/feed/", type: "RSS_FEED" as const, category: "vendor-news" },
      { name: "European Commission Digital", url: "https://digital-strategy.ec.europa.eu/en/rss.xml", type: "REGULATORY_BODY" as const, category: "regulation" },
      { name: "Responsible AI Institute", url: "https://www.responsible.ai/feed/", type: "INDUSTRY_REPORT" as const, category: "best-practice" },
      { name: "Wired - AI", url: "https://www.wired.com/feed/tag/ai/latest/rss", type: "RSS_FEED" as const, category: "vendor-news" },
    ];

    let sourcesCreated = 0;
    for (const source of agentSources) {
      const id = `seed-${source.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      await db.agentSource.upsert({
        where: { id },
        update: { ...source },
        create: { id, ...source },
      });
      sourcesCreated++;
    }

    // ── Default Settings ──────────────────────────────────────────────
    const defaultSettings = [
      { key: "enabled", value: true, description: "Master switch for the agent pipeline" },
      { key: "dailyArticleTarget", value: 2, description: "Number of articles to produce per pipeline run" },
      { key: "maxRewriteAttempts", value: 2, description: "Maximum rewrites before rejection" },
      { key: "minQAScore", value: 7.0, description: "Minimum QA score for approval (1-10)" },
      { key: "budgetLimitUsd", value: 5.0, description: "Maximum cost per pipeline run in USD" },
    ];

    let settingsCreated = 0;
    for (const setting of defaultSettings) {
      await db.agentSettings.upsert({
        where: { key: setting.key },
        update: {},
        create: {
          key: setting.key,
          value: setting.value as never,
          description: setting.description,
        },
      });
      settingsCreated++;
    }

    return NextResponse.json({
      success: true,
      sourcesSeeded: sourcesCreated,
      settingsSeeded: settingsCreated,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Seed failed", details: String(error) },
      { status: 500 },
    );
  }
}
