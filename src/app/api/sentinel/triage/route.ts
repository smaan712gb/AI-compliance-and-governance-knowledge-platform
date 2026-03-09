import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";
import { getTriageRuns, runTriageAgent } from "@/lib/sentinel/triage-agent";
import { logAuditEvent, extractAuditContext } from "@/lib/sentinel/audit";
import type { TriageStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId") || undefined;
    const eventId = searchParams.get("eventId") || undefined;
    const status = searchParams.get("status") as TriageStatus | undefined;
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;

    const result = await getTriageRuns({
      organizationId,
      eventId: eventId || undefined,
      status: status || undefined,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Sentinel Triage GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

const triggerTriageSchema = z.object({
  eventId: z.string().min(1),
  organizationId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = triggerTriageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const ctx = extractAuditContext(
      req,
      session.user.id,
      parsed.data.organizationId,
    );
    logAuditEvent(ctx, "TRIAGE_AGENT_TRIGGERED", {
      resourceType: "triage",
      resourceId: parsed.data.eventId,
      params: { triggeredBy: "manual" },
    });

    // Fire-and-forget — respond immediately
    const resultPromise = runTriageAgent(
      parsed.data.eventId,
      parsed.data.organizationId,
    );

    // Wait briefly to catch immediate errors (e.g., concurrency limit)
    const result = await Promise.race([
      resultPromise.then((r) => ({ started: true, runId: r.runId })),
      new Promise<{ started: boolean; runId: null }>((resolve) =>
        setTimeout(() => resolve({ started: true, runId: null }), 2000),
      ),
    ]);

    return NextResponse.json({ data: result }, { status: 202 });
  } catch (error) {
    console.error("[Sentinel Triage POST]", error);
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
