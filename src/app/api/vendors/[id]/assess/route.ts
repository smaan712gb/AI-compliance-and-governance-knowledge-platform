import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { runVendorAssessment } from "@/lib/agents/vendor-assessment-agent";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/vendors/[id]/assess
 *
 * Triggers an AI-powered vendor due diligence assessment.
 * Admin-only endpoint. Uses DeepSeek Reasoner for deep analysis.
 *
 * Returns the full assessment result including scores, findings, and recommendation.
 */
export async function POST(request: NextRequest, { params }: Props) {
  const { id } = await params;

  try {
    // Auth check — admin only
    const session = await auth();
    if (
      !session?.user?.role ||
      !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Admin access required" },
        },
        { status: 403 },
      );
    }

    // Verify vendor exists before running assessment
    const vendor = await db.vendor.findUnique({
      where: { id },
      select: { id: true, name: true },
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

    // Run the assessment
    const result = await runVendorAssessment(id, session.user.email || "admin");

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ASSESSMENT_FAILED",
            message: result.error || "Assessment failed",
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: {
        tokensUsed: result.tokensUsed,
        costUsd: result.costUsd,
      },
    });
  } catch (error) {
    console.error(
      `[API] POST /api/vendors/${id}/assess error:`,
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to run vendor assessment",
        },
      },
      { status: 500 },
    );
  }
}
