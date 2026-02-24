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
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const company = await db.companyProfile.findUnique({ where: { userId: session.user.id } });
    if (!company) {
      return NextResponse.json({ error: "Company profile required" }, { status: 400 });
    }

    const system = await db.aISystem.findFirst({
      where: { id, companyId: company.id },
    });

    if (!system) {
      return NextResponse.json({ error: "AI system not found" }, { status: 404 });
    }

    return NextResponse.json({ data: system });
  } catch (error) {
    console.error("[AI System] GET error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Failed to fetch AI system" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Props) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const company = await db.companyProfile.findUnique({ where: { userId: session.user.id } });
    if (!company) {
      return NextResponse.json({ error: "Company profile required" }, { status: 400 });
    }

    // Verify ownership
    const existing = await db.aISystem.findFirst({ where: { id, companyId: company.id } });
    if (!existing) {
      return NextResponse.json({ error: "AI system not found" }, { status: 404 });
    }

    const data = await request.json();
    delete data.id;
    delete data.companyId;
    delete data.createdAt;
    delete data.updatedAt;

    // Handle date fields
    if (data.deploymentDate) data.deploymentDate = new Date(data.deploymentDate);
    if (data.lastReviewDate) data.lastReviewDate = new Date(data.lastReviewDate);

    const system = await db.aISystem.update({ where: { id }, data });
    return NextResponse.json({ data: system });
  } catch (error) {
    console.error("[AI System] PUT error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Failed to update AI system" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const company = await db.companyProfile.findUnique({ where: { userId: session.user.id } });
    if (!company) {
      return NextResponse.json({ error: "Company profile required" }, { status: 400 });
    }

    const existing = await db.aISystem.findFirst({ where: { id, companyId: company.id } });
    if (!existing) {
      return NextResponse.json({ error: "AI system not found" }, { status: 404 });
    }

    await db.aISystem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AI System] DELETE error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Failed to delete AI system" }, { status: 500 });
  }
}
