import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkCCMPermission, getUserOrganization } from "@/lib/ccm/rbac";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgResult = await getUserOrganization(session.user.id);
    if (!orgResult) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const orgId = orgResult.organization.id;
    const perm = await checkCCMPermission(session.user.id, orgId, "finding", "read");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const report = await db.cCMReport.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        id: report.id,
        reportType: report.reportType,
        title: report.title,
        narrative: report.aiResponse,
        data: report.data,
        generatedAt: report.createdAt,
      },
    });
  } catch (error) {
    console.error("[CCM Reports] GET [id] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
