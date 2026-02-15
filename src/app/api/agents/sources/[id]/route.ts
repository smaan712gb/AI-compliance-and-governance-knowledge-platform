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

    const source = await db.agentSource.findUnique({
      where: { id },
      include: {
        evidenceCards: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true, title: true, relevanceScore: true, isUsed: true, createdAt: true },
        },
        _count: { select: { evidenceCards: true } },
      },
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: source });
  } catch (error) {
    console.error("Get source error:", error);
    return NextResponse.json(
      { error: "Failed to fetch source" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.role || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const allowedFields = ["name", "url", "type", "category", "isActive", "fetchIntervalHours", "reliability"] as const;
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if ((body as Record<string, unknown>)[field] !== undefined) {
        updateData[field] = (body as Record<string, unknown>)[field];
      }
    }

    const source = await db.agentSource.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: source });
  } catch (error) {
    console.error("Update source error:", error);
    return NextResponse.json(
      { error: "Failed to update source" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.role || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await db.agentSource.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete source error:", error);
    return NextResponse.json(
      { error: "Failed to delete source" },
      { status: 500 },
    );
  }
}
