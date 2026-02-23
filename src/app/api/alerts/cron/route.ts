import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runAlertPipeline } from "@/lib/agents/alert-pipeline";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // 2 minutes — alert pipeline is lighter than content pipeline

export async function POST(req: NextRequest) {
  try {
    // Accept either session auth (admin UI) or CRON_SECRET (API/cron-job.org)
    const cronSecret = req.headers
      .get("authorization")
      ?.replace("Bearer ", "");
    const hasValidSecret =
      process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET;

    if (!hasValidSecret) {
      const session = await auth();
      if (
        !session?.user?.role ||
        !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)
      ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const triggeredBy =
      (body as { triggeredBy?: string }).triggeredBy || "cron";

    // Check if an alert pipeline is already running
    const running = await db.alertRun.findFirst({
      where: { status: "RUNNING" },
    });

    if (running) {
      return NextResponse.json(
        { error: "Alert pipeline already running", runId: running.id },
        { status: 409 },
      );
    }

    // Fire-and-forget: start alert pipeline in background so we respond
    // within cron-job.org's 30-second timeout. The pipeline writes its own
    // status to the alertRun table, so we can check results via GET.
    runAlertPipeline(triggeredBy).catch((err) => {
      console.error("Background alert pipeline error:", err);
    });

    return NextResponse.json(
      { success: true, message: "Alert pipeline started" },
      { status: 202 },
    );
  } catch (error) {
    console.error("Alert pipeline trigger error:", error);
    return NextResponse.json(
      { error: "Failed to run alert pipeline" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const cronSecret = req.headers
      .get("authorization")
      ?.replace("Bearer ", "");
    const hasValidSecret =
      process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET;

    if (!hasValidSecret) {
      const session = await auth();
      if (
        !session?.user?.role ||
        !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)
      ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const latestRun = await db.alertRun.findFirst({
      orderBy: { startedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: latestRun });
  } catch (error) {
    console.error("Get alert run status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch alert run status" },
      { status: 500 },
    );
  }
}
