import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.role || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersThisMonth,
      totalRevenue,
      revenueThisMonth,
      activeSubscriptions,
      totalVendors,
      totalContent,
      totalSubscribers,
      affiliateClicks,
      recentPurchases,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      db.purchase.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
      db.purchase.aggregate({ where: { status: "COMPLETED", createdAt: { gte: thirtyDaysAgo } }, _sum: { amount: true } }),
      db.subscription.count({ where: { status: "ACTIVE" } }),
      db.vendor.count(),
      db.contentPage.count({ where: { status: "PUBLISHED" } }),
      db.subscriber.count({ where: { status: "ACTIVE" } }),
      db.affiliateClick.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      db.purchase.findMany({
        where: { status: "COMPLETED" },
        include: { user: { select: { name: true, email: true } }, product: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      overview: {
        totalUsers,
        newUsersThisMonth,
        totalRevenue: (totalRevenue._sum.amount || 0) / 100,
        revenueThisMonth: (revenueThisMonth._sum.amount || 0) / 100,
        activeSubscriptions,
        totalVendors,
        totalContent,
        totalSubscribers,
        affiliateClicks,
      },
      recentPurchases,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
