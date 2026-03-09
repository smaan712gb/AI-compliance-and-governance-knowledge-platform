import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import {
  getUserSentinelTier,
  getSentinelTierLimits,
  getPriceIdForTier,
} from "@/lib/sentinel/feature-gating";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tier = await getUserSentinelTier(session.user.id);
    const limits = getSentinelTierLimits(tier);

    const subscription = await db.sentinelSubscription.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({
      data: {
        tier,
        limits,
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
    console.error("[Sentinel Subscription] GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { plan } = body;

    if (!plan || !["pro", "expert", "strategic"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan. Choose: pro, expert, or strategic" },
        { status: 400 }
      );
    }

    const priceId = getPriceIdForTier(plan);
    if (!priceId) {
      return NextResponse.json(
        {
          error: `Stripe price not configured for plan "${plan}". Set STRIPE_PRICE_SENTINEL_${plan.toUpperCase()} in environment variables.`,
        },
        { status: 500 }
      );
    }

    // Check existing subscription
    const existingSub = await db.sentinelSubscription.findUnique({
      where: { userId: session.user.id },
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

    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch (err) {
        const stripeErr = err as { code?: string };
        if (stripeErr?.code === "resource_missing") {
          customerId = undefined;
          await db.user.update({
            where: { id: session.user.id },
            data: { stripeCustomerId: null },
          });
        } else {
          throw err;
        }
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user?.email || undefined,
        name: user?.name || undefined,
        metadata: {
          userId: session.user.id,
          product: "sentinel",
        },
      });
      customerId = customer.id;
      await db.user.update({
        where: { id: session.user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/sentinel/dashboard/settings?checkout=success`,
      cancel_url: `${siteUrl}/sentinel/pricing?checkout=cancelled`,
      metadata: {
        product: "sentinel",
        userId: session.user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          product: "sentinel",
          userId: session.user.id,
          plan,
        },
      },
    });

    return NextResponse.json({ data: { checkoutUrl: checkoutSession.url } });
  } catch (error) {
    console.error("[Sentinel Subscription] POST error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
