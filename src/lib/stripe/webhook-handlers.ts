import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getTierFromPriceId } from "@/lib/sentinel/feature-gating";
import type Stripe from "stripe";

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) return;

  // Update user's stripe customer ID
  if (session.customer) {
    await db.user.update({
      where: { id: userId },
      data: { stripeCustomerId: session.customer as string },
    });
  }

  if (session.mode === "payment") {
    const productId = session.metadata?.productId;
    if (productId) {
      // Idempotency: skip if purchase already exists (handles duplicate webhook delivery)
      const existing = await db.purchase.findUnique({
        where: { stripeCheckoutSessionId: session.id },
      });
      if (!existing) {
        await db.purchase.create({
          data: {
            userId,
            productId,
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: session.payment_intent as string,
            status: "COMPLETED",
            amount: session.amount_total || 0,
            currency: session.currency || "usd",
          },
        });
      }
    }
  }

  if (session.mode === "subscription") {
    const subscriptionId = session.subscription as string;

    // Fetch real period dates from Stripe instead of hardcoding
    let periodStart = new Date();
    let periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    let stripePriceId = session.metadata?.priceId || "";
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const firstItem = sub.items.data[0];
      if (firstItem) {
        periodStart = new Date(firstItem.current_period_start * 1000);
        periodEnd = new Date(firstItem.current_period_end * 1000);
        if (!stripePriceId) stripePriceId = firstItem.price.id;
      }
    } catch {
      // Fallback to approximate dates if Stripe retrieval fails
    }

    // Route CCM subscriptions to CCMSubscription table
    if (session.metadata?.product === "ccm") {
      const orgId = session.metadata?.organizationId;
      if (orgId) {
        await db.cCMSubscription.upsert({
          where: { organizationId: orgId },
          create: {
            organizationId: orgId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId,
            status: "ACTIVE",
            stripeCurrentPeriodStart: periodStart,
            stripeCurrentPeriodEnd: periodEnd,
          },
          update: {
            stripeSubscriptionId: subscriptionId,
            stripePriceId,
            status: "ACTIVE",
            stripeCurrentPeriodStart: periodStart,
            stripeCurrentPeriodEnd: periodEnd,
          },
        });
      }
    } else if (session.metadata?.product === "sentinel") {
      // Route Sentinel subscriptions to SentinelSubscription table
      const sentinelTier = getTierFromPriceId(stripePriceId);
      await db.sentinelSubscription.upsert({
        where: { userId },
        create: {
          userId,
          tier: sentinelTier,
          status: "ACTIVE",
          stripeSubscriptionId: subscriptionId,
          stripePriceId,
          stripeCurrentPeriodStart: periodStart,
          stripeCurrentPeriodEnd: periodEnd,
        },
        update: {
          tier: sentinelTier,
          status: "ACTIVE",
          stripeSubscriptionId: subscriptionId,
          stripePriceId,
          stripeCurrentPeriodStart: periodStart,
          stripeCurrentPeriodEnd: periodEnd,
        },
      });
    } else {
      await db.subscription.upsert({
        where: { userId },
        create: {
          userId,
          stripeSubscriptionId: subscriptionId,
          stripePriceId,
          status: "ACTIVE",
          stripeCurrentPeriodStart: periodStart,
          stripeCurrentPeriodEnd: periodEnd,
        },
        update: {
          stripeSubscriptionId: subscriptionId,
          stripePriceId,
          status: "ACTIVE",
          stripeCurrentPeriodStart: periodStart,
          stripeCurrentPeriodEnd: periodEnd,
        },
      });
    }
  }
}

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const firstItem = subscription.items.data[0];
  const mappedStatus = mapSubscriptionStatus(subscription.status);

  // Check if this is a CCM subscription
  if (subscription.metadata?.product === "ccm") {
    const ccmSub = await db.cCMSubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (ccmSub) {
      await db.cCMSubscription.update({
        where: { id: ccmSub.id },
        data: {
          status: mappedStatus,
          stripeCurrentPeriodStart: firstItem ? new Date(firstItem.current_period_start * 1000) : undefined,
          stripeCurrentPeriodEnd: firstItem ? new Date(firstItem.current_period_end * 1000) : undefined,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });
      return;
    }
  }

  // Check if this is a Sentinel subscription
  if (subscription.metadata?.product === "sentinel") {
    const sentinelSub = await db.sentinelSubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (sentinelSub) {
      const newTier = firstItem ? getTierFromPriceId(firstItem.price.id) : sentinelSub.tier;
      await db.sentinelSubscription.update({
        where: { id: sentinelSub.id },
        data: {
          tier: newTier,
          status: mappedStatus,
          stripeCurrentPeriodStart: firstItem ? new Date(firstItem.current_period_start * 1000) : undefined,
          stripeCurrentPeriodEnd: firstItem ? new Date(firstItem.current_period_end * 1000) : undefined,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });
      return;
    }
  }

  const sub = await db.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!sub) return;

  await db.subscription.update({
    where: { id: sub.id },
    data: {
      status: mappedStatus,
      stripeCurrentPeriodStart: firstItem
        ? new Date(firstItem.current_period_start * 1000)
        : undefined,
      stripeCurrentPeriodEnd: firstItem
        ? new Date(firstItem.current_period_end * 1000)
        : undefined,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Check if this is a CCM subscription
  if (subscription.metadata?.product === "ccm") {
    const ccmSub = await db.cCMSubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (ccmSub) {
      await db.cCMSubscription.update({
        where: { id: ccmSub.id },
        data: { status: "CANCELED" },
      });
      return;
    }
  }

  // Check if this is a Sentinel subscription
  if (subscription.metadata?.product === "sentinel") {
    const sentinelSub = await db.sentinelSubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (sentinelSub) {
      await db.sentinelSubscription.update({
        where: { id: sentinelSub.id },
        data: { status: "CANCELED", tier: "FREE" },
      });
      return;
    }
  }

  const sub = await db.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!sub) return;

  await db.subscription.update({
    where: { id: sub.id },
    data: { status: "CANCELED" },
  });
}

export async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionRef = invoice.parent?.subscription_details?.subscription;
  if (!subscriptionRef) return;

  const subscriptionId =
    typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef.id;

  // Update CCM subscription if applicable
  const ccmSub = await db.cCMSubscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });
  if (ccmSub) {
    await db.cCMSubscription.update({
      where: { id: ccmSub.id },
      data: { status: "PAST_DUE" },
    });
    return;
  }

  // Update Sentinel subscription if applicable
  const sentinelSub = await db.sentinelSubscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });
  if (sentinelSub) {
    await db.sentinelSubscription.update({
      where: { id: sentinelSub.id },
      data: { status: "PAST_DUE" },
    });
    return;
  }

  const sub = await db.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });
  if (!sub) return;

  await db.subscription.update({
    where: { id: sub.id },
    data: { status: "PAST_DUE" },
  });
}

function mapSubscriptionStatus(status: Stripe.Subscription.Status) {
  const map: Record<string, string> = {
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    incomplete: "INCOMPLETE",
    trialing: "TRIALING",
    incomplete_expired: "CANCELED",
    unpaid: "PAST_DUE",
    paused: "CANCELED",
  };
  return (map[status] || "INCOMPLETE") as "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE" | "TRIALING";
}
