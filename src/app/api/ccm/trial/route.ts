import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserOrganization } from "@/lib/ccm/rbac";

/**
 * POST /api/ccm/trial
 * Provisions a 14-day Professional trial for an org that has no subscription.
 * Idempotent — safe to call multiple times.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgResult = await getUserOrganization(session.user.id);
    if (!orgResult) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { organization, role } = orgResult;

    // Only OWNER or ADMIN can start a trial
    if (role !== "OWNER" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if subscription already exists
    const existing = await db.cCMSubscription.findUnique({
      where: { organizationId: organization.id },
    });

    if (existing && (existing.status === "ACTIVE" || existing.status === "TRIALING")) {
      return NextResponse.json({
        data: { alreadyActive: true, status: existing.status },
      });
    }

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const trial = await db.cCMSubscription.upsert({
      where: { organizationId: organization.id },
      create: {
        organizationId: organization.id,
        stripeSubscriptionId: `trial_${organization.id}`,
        stripePriceId: "trial_professional",
        stripeCurrentPeriodStart: now,
        stripeCurrentPeriodEnd: trialEnd,
        status: "TRIALING",
        cancelAtPeriodEnd: true,
      },
      update: {
        stripeSubscriptionId: `trial_${organization.id}`,
        stripePriceId: "trial_professional",
        stripeCurrentPeriodStart: now,
        stripeCurrentPeriodEnd: trialEnd,
        status: "TRIALING",
        cancelAtPeriodEnd: true,
      },
    });

    return NextResponse.json({
      data: {
        status: trial.status,
        trialEndsAt: trial.stripeCurrentPeriodEnd,
        tier: "professional",
      },
    });
  } catch (error) {
    console.error("[CCM Trial] POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
