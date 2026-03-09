import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";
import { validateApiKey } from "@/lib/sentinel/api-auth";
import { getUserSentinelTier } from "@/lib/sentinel/feature-gating";
import { getCaseById, updateCase, addNote } from "@/lib/sentinel/workflow";

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const u = await resolveUser(req);
    if ("error" in u) return NextResponse.json({ error: u.error }, { status: u.status });

    if (u.tier === "FREE" || u.tier === "PRO") {
      return NextResponse.json({ error: "Cases require Expert tier or above" }, { status: 403 });
    }

    const { id } = await params;
    const result = await getCaseById(id, u.userId);
    return NextResponse.json({ data: result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal error";
    const status = msg === "Case not found" ? 404 : msg === "Access denied" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

const updateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "PENDING_REVIEW", "ESCALATED", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  assigneeId: z.string().nullable().optional(),
  tags: z.array(z.string()).max(20).optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const u = await resolveUser(req);
    if ("error" in u) return NextResponse.json({ error: u.error }, { status: u.status });

    if (u.tier === "FREE" || u.tier === "PRO") {
      return NextResponse.json({ error: "Cases require Expert tier or above" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
    }

    const updates = {
      ...parsed.data,
      dueDate: parsed.data.dueDate === null ? null : parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
    };
    // Remove undefined keys so Prisma doesn't set them
    Object.keys(updates).forEach((k) => {
      if ((updates as Record<string, unknown>)[k] === undefined) delete (updates as Record<string, unknown>)[k];
    });

    const result = await updateCase(id, u.userId, updates);
    return NextResponse.json({ data: result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal error";
    const status = msg === "Case not found" ? 404 : msg === "Access denied" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

const noteSchema = z.object({
  content: z.string().min(1).max(10000),
  isInternal: z.boolean().default(false),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const u = await resolveUser(req);
    if ("error" in u) return NextResponse.json({ error: u.error }, { status: u.status });

    if (u.tier === "FREE" || u.tier === "PRO") {
      return NextResponse.json({ error: "Cases require Expert tier or above" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = noteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
    }

    const note = await addNote(id, u.userId, parsed.data.content, parsed.data.isInternal);
    return NextResponse.json({ data: note }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal error";
    const status = msg === "Case not found" ? 404 : msg === "Access denied" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
