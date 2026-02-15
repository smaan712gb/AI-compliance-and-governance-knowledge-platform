import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.role || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const activeOnly = searchParams.get("active") === "true";

    const sources = await db.agentSource.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { name: "asc" },
      include: {
        _count: { select: { evidenceCards: true } },
      },
    });

    return NextResponse.json({ success: true, data: sources });
  } catch (error) {
    console.error("List sources error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sources" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.role || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, url, type, category, isActive, fetchIntervalHours } = body as {
      name: string;
      url: string;
      type: string;
      category: string;
      isActive?: boolean;
      fetchIntervalHours?: number;
    };

    if (!name || !url || !type || !category) {
      return NextResponse.json(
        { error: "name, url, type, and category are required" },
        { status: 400 },
      );
    }

    const source = await db.agentSource.create({
      data: {
        name,
        url,
        type: type as never,
        category,
        isActive: isActive ?? true,
        fetchIntervalHours: fetchIntervalHours ?? 24,
      },
    });

    return NextResponse.json({ success: true, data: source }, { status: 201 });
  } catch (error) {
    console.error("Create source error:", error);
    return NextResponse.json(
      { error: "Failed to create source" },
      { status: 500 },
    );
  }
}
