import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runPipeline } from "@/lib/agents/pipeline";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for full pipeline

export async function POST(req: NextRequest) {
  try {
    // Accept either session auth (admin UI) or CRON_SECRET (API/testing)
    const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "");
    const hasValidSecret = process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET;

    if (!hasValidSecret) {
      const session = await auth();
      if (!session?.user?.role || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const triggeredBy = (body as { triggeredBy?: string }).triggeredBy || "manual";

    // Check if a pipeline is already running
    const running = await db.agentRun.findFirst({
      where: { status: "RUNNING" },
    });

    if (running) {
      return NextResponse.json(
        { error: "Pipeline already running", runId: running.id },
        { status: 409 },
      );
    }

    const result = await runPipeline(triggeredBy);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Pipeline trigger error:", error);
    return NextResponse.json(
      { error: "Failed to run pipeline" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "");
    const hasValidSecret = process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET;

    if (!hasValidSecret) {
      const session = await auth();
      if (!session?.user?.role || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const latestRun = await db.agentRun.findFirst({
      orderBy: { startedAt: "desc" },
      include: {
        tasks: {
          select: { id: true, title: true, status: true, type: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: latestRun });
  } catch (error) {
    console.error("Get run status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch run status" },
      { status: 500 },
    );
  }
}
