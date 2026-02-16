import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadConfig } from "@/lib/agents/config";
import { getDeepSeek } from "@/lib/deepseek";

export const dynamic = "force-dynamic";

/**
 * Health check for the agent pipeline.
 * Verifies: DB tables, config, DeepSeek connectivity, source availability.
 */
export async function GET(req: NextRequest) {
  try {
    const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "");
    const hasValidSecret = process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET;

    if (!hasValidSecret) {
      const session = await auth();
      if (
        !session?.user?.role ||
        !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)
      ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const checks: Record<string, { ok: boolean; detail: string }> = {};

    // 1. Database tables exist
    try {
      const [sources, evidence, tasks, runs, settings] = await Promise.all([
        db.agentSource.count(),
        db.evidenceCard.count(),
        db.agentTask.count(),
        db.agentRun.count(),
        db.agentSettings.count(),
      ]);
      checks.database = {
        ok: true,
        detail: `sources=${sources}, evidence=${evidence}, tasks=${tasks}, runs=${runs}, settings=${settings}`,
      };
    } catch (err) {
      checks.database = {
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      };
    }

    // 2. Config loads
    try {
      const config = await loadConfig();
      checks.config = {
        ok: true,
        detail: `enabled=${config.enabled}, target=${config.dailyArticleTarget}, qaMin=${config.minQAScore}, budget=$${config.budgetLimitUsd}`,
      };
    } catch (err) {
      checks.config = {
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      };
    }

    // 3. DeepSeek API key present
    try {
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        checks.deepseek = { ok: false, detail: "DEEPSEEK_API_KEY not set" };
      } else {
        // Quick connectivity test — list models
        const client = getDeepSeek();
        const models = await client.models.list();
        checks.deepseek = {
          ok: true,
          detail: `Connected. Models available: ${models.data?.length ?? "unknown"}`,
        };
      }
    } catch (err) {
      checks.deepseek = {
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      };
    }

    // 4. CRON_SECRET set
    checks.cronSecret = {
      ok: !!process.env.CRON_SECRET,
      detail: process.env.CRON_SECRET ? "Set" : "NOT SET",
    };

    // 5. Active sources exist
    try {
      const activeSources = await db.agentSource.count({
        where: { isActive: true },
      });
      checks.sources = {
        ok: activeSources > 0,
        detail: `${activeSources} active sources`,
      };
    } catch (err) {
      checks.sources = {
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      };
    }

    const allOk = Object.values(checks).every((c) => c.ok);

    return NextResponse.json({
      status: allOk ? "healthy" : "unhealthy",
      checks,
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", error: String(error) },
      { status: 500 },
    );
  }
}
