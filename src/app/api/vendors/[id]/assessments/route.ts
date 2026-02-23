import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/vendors/[id]/assessments
 *
 * Lists all assessments for a given vendor, paginated.
 * Available to any authenticated user (admin or regular user).
 *
 * Query params:
 *   - page (default: 1)
 *   - limit (default: 10, max: 50)
 *   - status (optional filter: PENDING, RUNNING, COMPLETED, FAILED)
 */
export async function GET(request: NextRequest, { params }: Props) {
  const { id } = await params;

  try {
    // Auth check — any authenticated user
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        },
        { status: 401 },
      );
    }

    // Verify vendor exists
    const vendor = await db.vendor.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true },
    });

    if (!vendor) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Vendor not found" },
        },
        { status: 404 },
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const status = searchParams.get("status");

    // Build where clause
    const where: { vendorId: string; status?: string } = { vendorId: id };
    if (status) {
      where.status = status;
    }

    // Fetch assessments with pagination
    const [assessments, total] = await Promise.all([
      db.vendorAssessment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          vendorId: true,
          assessmentType: true,
          status: true,
          overallScore: true,
          securityScore: true,
          privacyScore: true,
          complianceScore: true,
          financialScore: true,
          dimensions: true,
          findings: true,
          recommendation: true,
          triggeredBy: true,
          tokensUsed: true,
          costUsd: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.vendorAssessment.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: assessments,
      vendor: {
        id: vendor.id,
        name: vendor.name,
        slug: vendor.slug,
      },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(
      `[API] GET /api/vendors/${id}/assessments error:`,
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch vendor assessments",
        },
      },
      { status: 500 },
    );
  }
}
