import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkFeatureAccess } from "@/lib/feature-gating";

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

    // Check feature access
    const access = await checkFeatureAccess(session.user.id, "alerts");
    if (!access.allowed) {
      return NextResponse.json(
        {
          error: "Regulatory alerts require a Starter plan or higher.",
          upgradeRequired: true,
        },
        { status: 403 },
      );
    }

    // Get user's company
    const company = await db.companyProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!company) {
      return NextResponse.json(
        { error: "No company profile found" },
        { status: 404 },
      );
    }

    // Fetch the CompanyAlert by ID, ensuring it belongs to this company
    const companyAlert = await db.companyAlert.findUnique({
      where: { id },
      include: { alert: true },
    });

    if (!companyAlert) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 },
      );
    }

    if (companyAlert.companyId !== company.id) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: companyAlert });
  } catch (error) {
    console.error("Get alert error:", error);
    return NextResponse.json(
      { error: "Failed to fetch alert" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: Props) {
  const { id } = await params;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's company
    const company = await db.companyProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!company) {
      return NextResponse.json(
        { error: "No company profile found" },
        { status: 404 },
      );
    }

    // Verify the alert belongs to this company
    const existing = await db.companyAlert.findUnique({
      where: { id },
    });

    if (!existing || existing.companyId !== company.id) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { isRead, isDismissed } = body;

    const updateData: { isRead?: boolean; isDismissed?: boolean } = {};
    if (typeof isRead === "boolean") {
      updateData.isRead = isRead;
    }
    if (typeof isDismissed === "boolean") {
      updateData.isDismissed = isDismissed;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update. Provide isRead or isDismissed." },
        { status: 400 },
      );
    }

    const updated = await db.companyAlert.update({
      where: { id },
      data: updateData,
      include: { alert: true },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Update alert error:", error);
    return NextResponse.json(
      { error: "Failed to update alert" },
      { status: 500 },
    );
  }
}
