import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";
import { validateApiKey } from "@/lib/sentinel/api-auth";
import { getUserSentinelTier } from "@/lib/sentinel/feature-gating";
import { createBriefing, getUserBriefings } from "@/lib/sentinel/workflow";

async function resolveUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.includes("stl_")) {
    const v = await validateApiKey(authHeader);
    if (!v.valid) return { error: v.error, status: 401 };
    return { userId: v.userId!, tier: v.tier! };
  }
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", status: 401 };
  const tier = await getUserSentinelTier(session.user.id);
  return { userId: session.user.id, tier };
}

export async function GET(req: NextRequest) {
  try {
    const u = await resolveUser(req);
    if ("error" in u) return NextResponse.json({ error: u.error }, { status: u.status });

    if (u.tier === "FREE" || u.tier === "PRO") {
      return NextResponse.json({ error: "Briefings require Expert tier or above" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;

    const result = await getUserBriefings(u.userId, page, limit);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Sentinel Briefings GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

const createBriefingSchema = z.object({
  title: z.string().min(1).max(500),
  eventIds: z.array(z.string()).min(1).max(100),
  format: z.enum(["markdown", "html"]).default("markdown"),
});

export async function POST(req: NextRequest) {
  try {
    const u = await resolveUser(req);
    if ("error" in u) return NextResponse.json({ error: u.error }, { status: u.status });

    if (u.tier === "FREE" || u.tier === "PRO") {
      return NextResponse.json({ error: "Briefings require Expert tier or above" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createBriefingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
    }

    const result = await createBriefing({
      userId: u.userId,
      title: parsed.data.title,
      eventIds: parsed.data.eventIds,
      format: parsed.data.format,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal error";
    if (msg === "No valid events found for briefing") {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error("[Sentinel Briefings POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
