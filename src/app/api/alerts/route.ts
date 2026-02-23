import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkFeatureAccess } from "@/lib/feature-gating";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check feature access for alerts
    const access = await checkFeatureAccess(session.user.id, "alerts");
    if (!access.allowed) {
      return NextResponse.json(
        {
          error: "Regulatory alerts require a Starter plan or higher.",
          upgradeRequired: true,
          tier: access.tier,
        },
        { status: 403 },
      );
    }

    // Get user's company profile
    const company = await db.companyProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!company) {
      return NextResponse.json({
        data: [],
        total: 0,
        unreadCount: 0,
        onboardingRequired: true,
      });
    }

    // Parse query params
    const { searchParams } = request.nextUrl;
    const domain = searchParams.get("domain") || undefined;
    const urgency = searchParams.get("urgency") || undefined;
    const readParam = searchParams.get("read");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    // Build where clause for CompanyAlert
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      companyId: company.id,
      isDismissed: false,
    };

    // Filter by read status
    if (readParam === "true") {
      where.isRead = true;
    } else if (readParam === "false") {
      where.isRead = false;
    }

    // Filter by domain/urgency on the related alert
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const alertWhere: any = { isActive: true };
    if (domain) {
      alertWhere.domain = domain;
    }
    if (urgency) {
      alertWhere.urgency = urgency;
    }

    if (Object.keys(alertWhere).length > 1) {
      where.alert = alertWhere;
    } else {
      where.alert = { isActive: true };
    }

    // Get total count and unread count in parallel
    const [total, unreadCount, companyAlerts] = await Promise.all([
      db.companyAlert.count({ where }),
      db.companyAlert.count({
        where: {
          companyId: company.id,
          isDismissed: false,
          isRead: false,
          alert: { isActive: true },
        },
      }),
      db.companyAlert.findMany({
        where,
        include: {
          alert: true,
        },
        orderBy: { alert: { createdAt: "desc" } },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      data: companyAlerts,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("List alerts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 },
    );
  }
}
