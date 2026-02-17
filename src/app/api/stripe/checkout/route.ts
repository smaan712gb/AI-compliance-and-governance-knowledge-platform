import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/stripe/checkout";
import { db } from "@/lib/db";

const SUBSCRIPTION_PRICE_MAP: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_SUB_STARTER,
  professional: process.env.STRIPE_PRICE_SUB_PRO,
  enterprise: process.env.STRIPE_PRICE_SUB_ENTERPRISE,
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { priceId, productId, mode, tier } = await request.json();

    if (!priceId || !mode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Map friendly tier names to actual Stripe price IDs
    const resolvedPriceId = SUBSCRIPTION_PRICE_MAP[priceId] || priceId;

    if (!resolvedPriceId || resolvedPriceId === "undefined") {
      return NextResponse.json({ error: "Invalid price ID" }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const checkoutSession = await createCheckoutSession({
      priceId: resolvedPriceId,
      userId: session.user.id,
      userEmail: session.user.email!,
      mode,
      successUrl: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${siteUrl}/checkout/cancel`,
      metadata: {
        ...(productId && { productId }),
        ...(tier && { tier }),
        priceId,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
