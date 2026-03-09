import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";
import { validateApiKey } from "@/lib/sentinel/api-auth";
import { getUserSentinelTier, checkFeatureAccess } from "@/lib/sentinel/feature-gating";
import { createCase, getCases, getCaseStats } from "@/lib/sentinel/workflow";

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

    if (!checkFeatureAccess(u.tier, "api") && u.tier !== "EXPERT" && u.tier !== "STRATEGIC") {
      // Cases require EXPERT+
      if (u.tier === "FREE" || u.tier === "PRO") {
        return NextResponse.json({ error: "Cases require Expert tier or above" }, { status: 403 });
      }
    }

    const { searchParams } = new URL(req.url);

    // Stats view
    if (searchParams.get("view") === "stats") {
      const stats = await getCaseStats(u.userId);
      return NextResponse.json({ data: stats });
    }

    const filters = {
      status: searchParams.get("status") as import("@/lib/sentinel/workflow").CaseStatus | undefined,
      priority: searchParams.get("priority") as import("@/lib/sentinel/workflow").CasePriority | undefined,
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || 20,
    };

    const result = await getCases(u.userId, filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Sentinel Cases GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

const createCaseSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  assigneeId: z.string().optional(),
  eventIds: z.array(z.string()).max(50).optional(),
  tags: z.array(z.string()).max(20).optional(),
  dueDate: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const u = await resolveUser(req);
    if ("error" in u) return NextResponse.json({ error: u.error }, { status: u.status });

    if (u.tier === "FREE" || u.tier === "PRO") {
      return NextResponse.json({ error: "Cases require Expert tier or above" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createCaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
    }

    const result = await createCase({
      ...parsed.data,
      createdById: u.userId,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error("[Sentinel Cases POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
