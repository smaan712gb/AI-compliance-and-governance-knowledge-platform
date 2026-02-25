import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkCCMPermission, getUserOrganization } from "@/lib/ccm/rbac";
import { getOrgCCMTier, getCCMTierLimits } from "@/lib/ccm/feature-gating";
import { logAuditEvent, extractRequestMeta } from "@/lib/ccm/audit-logger";
import { stripe } from "@/lib/stripe";

const CCM_PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_CCM_STARTER || "",
  professional: process.env.STRIPE_PRICE_CCM_PRO || "",
  enterprise: process.env.STRIPE_PRICE_CCM_ENTERPRISE || "",
};

export async function GET() {
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
    const perm = await checkCCMPermission(session.user.id, orgId, "settings", "read");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tier = await getOrgCCMTier(orgId);
    const limits = getCCMTierLimits(tier);

    const subscription = await db.cCMSubscription.findUnique({
      where: { organizationId: orgId },
    });

    // Get current usage
    const [connectorCount, memberCount, ruleCount] = await Promise.all([
      db.eRPConnector.count({ where: { organizationId: orgId, isActive: true } }),
      db.cCMOrganizationMember.count({ where: { organizationId: orgId, isActive: true } }),
      db.monitoringRule.count({ where: { organizationId: orgId, isActive: true } }),
    ]);

    return NextResponse.json({
      data: {
        tier,
        limits,
        usage: {
          connectors: connectorCount,
          members: memberCount,
          rules: ruleCount,
        },
        subscription: subscription
          ? {
              status: subscription.status,
              currentPeriodStart: subscription.stripeCurrentPeriodStart,
              currentPeriodEnd: subscription.stripeCurrentPeriodEnd,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("[CCM Subscription] GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
    const perm = await checkCCMPermission(session.user.id, orgId, "settings", "update");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { plan } = body;

    if (!plan || !CCM_PRICE_IDS[plan]) {
      return NextResponse.json(
        { error: "Invalid plan. Choose: starter, professional, or enterprise" },
        { status: 400 }
      );
    }

    const priceId = CCM_PRICE_IDS[plan];
    if (!priceId) {
      return NextResponse.json(
        { error: "Price not configured. Contact support." },
        { status: 500 }
      );
    }

    // Check if org already has a subscription
    const existingSub = await db.cCMSubscription.findUnique({
      where: { organizationId: orgId },
    });

    if (existingSub && existingSub.status === "ACTIVE") {
      return NextResponse.json(
        { error: "Active subscription exists. Use the billing portal to change plans." },
        { status: 409 }
      );
    }

    // Get or create Stripe customer
    const user = await db.user.findUnique({ where: { id: session.user.id } });
    let customerId = user?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user?.email || undefined,
        name: user?.name || undefined,
        metadata: {
          userId: session.user.id,
          organizationId: orgId,
          product: "ccm",
        },
      });
      customerId = customer.id;
      await db.user.update({
        where: { id: session.user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/ccm/dashboard/settings?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/ccm/pricing?checkout=cancelled`,
      metadata: {
        product: "ccm",
        organizationId: orgId,
        userId: session.user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          product: "ccm",
          organizationId: orgId,
          plan,
        },
      },
    });

    const { ipAddress, userAgent } = extractRequestMeta(req);
    await logAuditEvent({
      organizationId: orgId,
      userId: session.user.id,
      action: "UPDATE_ORG_SETTINGS",
      resourceType: "subscription",
      details: { action: "checkout_initiated", plan },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data: { checkoutUrl: checkoutSession.url } });
  } catch (error) {
    console.error("[CCM Subscription] POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
