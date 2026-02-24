import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const company = await db.companyProfile.findUnique({ where: { userId: session.user.id } });
    if (!company) return NextResponse.json({ error: "Company profile required" }, { status: 400 });

    const risk = await db.risk.findFirst({
      where: { id, companyId: company.id },
      include: { assessments: { orderBy: { createdAt: "desc" } } },
    });

    if (!risk) return NextResponse.json({ error: "Risk not found" }, { status: 404 });
    return NextResponse.json({ data: risk });
  } catch (error) {
    console.error("[Risk] GET error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Failed to fetch risk" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Props) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const company = await db.companyProfile.findUnique({ where: { userId: session.user.id } });
    if (!company) return NextResponse.json({ error: "Company profile required" }, { status: 400 });

    const existing = await db.risk.findFirst({ where: { id, companyId: company.id } });
    if (!existing) return NextResponse.json({ error: "Risk not found" }, { status: 404 });

    const data = await request.json();
    delete data.id;
    delete data.companyId;
    delete data.createdAt;
    delete data.updatedAt;

    if (data.targetDate) data.targetDate = new Date(data.targetDate);
    if (data.reviewDate) data.reviewDate = new Date(data.reviewDate);

    // Recalculate inherent score if likelihood/impact changed
    if (data.likelihood || data.impact) {
      data.inherentScore = (data.likelihood || existing.likelihood) * (data.impact || existing.impact);
    }

    const risk = await db.risk.update({ where: { id }, data });
    return NextResponse.json({ data: risk });
  } catch (error) {
    console.error("[Risk] PUT error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Failed to update risk" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const company = await db.companyProfile.findUnique({ where: { userId: session.user.id } });
    if (!company) return NextResponse.json({ error: "Company profile required" }, { status: 400 });

    const existing = await db.risk.findFirst({ where: { id, companyId: company.id } });
    if (!existing) return NextResponse.json({ error: "Risk not found" }, { status: 404 });

    await db.risk.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Risk] DELETE error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Failed to delete risk" }, { status: 500 });
  }
}
