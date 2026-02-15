import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { AgentTaskStatus, AgentTaskType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.role || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") as AgentTaskStatus | null;
    const type = searchParams.get("type") as AgentTaskType | null;
    const runId = searchParams.get("runId");
    const skip = (page - 1) * limit;

    const where = {
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(runId ? { runId } : {}),
    };

    const [tasks, total] = await Promise.all([
      db.agentTask.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          run: { select: { id: true, startedAt: true, status: true } },
          _count: { select: { evidence: true, socialPosts: true } },
        },
      }),
      db.agentTask.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: tasks,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("List tasks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 },
    );
  }
}
