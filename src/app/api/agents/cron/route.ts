import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/agents/pipeline";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "")
      || req.nextUrl.searchParams.get("secret");

    if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if pipeline is already running
    const running = await db.agentRun.findFirst({
      where: { status: "RUNNING" },
    });

    if (running) {
      return NextResponse.json({
        success: false,
        message: "Pipeline already running",
        runId: running.id,
      });
    }

    const result = await runPipeline("cron");

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Cron pipeline error:", error);
    return NextResponse.json(
      { error: "Pipeline execution failed" },
      { status: 500 },
    );
  }
}
