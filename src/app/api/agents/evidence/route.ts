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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const isUsed = searchParams.get("isUsed");
    const category = searchParams.get("category");
    const sourceId = searchParams.get("sourceId");
    const skip = (page - 1) * limit;

    const where = {
      ...(isUsed !== null ? { isUsed: isUsed === "true" } : {}),
      ...(category ? { category } : {}),
      ...(sourceId ? { sourceId } : {}),
    };

    const [cards, total] = await Promise.all([
      db.evidenceCard.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          source: { select: { name: true, type: true } },
        },
      }),
      db.evidenceCard.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: cards,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("List evidence error:", error);
    return NextResponse.json(
      { error: "Failed to fetch evidence cards" },
      { status: 500 },
    );
  }
}
