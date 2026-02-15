import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.role || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const run = await db.agentRun.findUnique({
      where: { id },
      include: {
        tasks: {
          include: {
            evidence: {
              include: { evidenceCard: { select: { title: true, url: true } } },
            },
            socialPosts: true,
          },
          orderBy: { priority: "desc" },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: run });
  } catch (error) {
    console.error("Get run detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch run" },
      { status: 500 },
    );
  }
}
