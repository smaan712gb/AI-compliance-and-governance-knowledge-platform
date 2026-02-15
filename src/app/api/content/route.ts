import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

const contentCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  type: z.enum([
    "BLOG_POST",
    "BEST_OF",
    "COMPARISON",
    "ALTERNATIVES",
    "GUIDE",
    "LANDING_PAGE",
  ]),
  body: z.string().min(1, "Body is required"),
  status: z
    .enum(["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"])
    .optional()
    .default("DRAFT"),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  excerpt: z.string().optional(),
  featuredImage: z.string().optional(),
  publishedAt: z.coerce.date().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const isAdmin =
      session?.user?.role &&
      ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);

    const url = request.nextUrl;
    const type = url.searchParams.get("type");
    const status = url.searchParams.get("status");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};
    if (type) where.type = type;

    if (isAdmin) {
      // Admins can filter by any status, or see all statuses
      if (status) where.status = status;
    } else {
      // Unauthenticated or non-admin users only see published content
      where.status = "PUBLISHED";
    }

    const [pages, total] = await Promise.all([
      db.contentPage.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.contentPage.count({ where }),
    ]);

    return NextResponse.json({ data: pages, total, page, limit });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch content" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (
      !session?.user?.role ||
      !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = contentCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const page = await db.contentPage.create({ data: parsed.data });
    return NextResponse.json(page, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create content" },
      { status: 500 }
    );
  }
}
