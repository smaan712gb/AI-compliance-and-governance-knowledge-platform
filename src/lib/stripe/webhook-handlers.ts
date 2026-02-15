import { db } from "@/lib/db";
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

  if (session.mode === "subscription") {
    const subscriptionId = session.subscription as string;

    await db.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: session.metadata?.priceId || "",
        status: "ACTIVE",
        stripeCurrentPeriodStart: new Date(),
        stripeCurrentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      update: {
        stripeSubscriptionId: subscriptionId,
        stripePriceId: session.metadata?.priceId || "",
        status: "ACTIVE",
        stripeCurrentPeriodStart: new Date(),
        stripeCurrentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }
}

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const sub = await db.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!sub) return;

  const firstItem = subscription.items.data[0];
  await db.subscription.update({
    where: { id: sub.id },
    data: {
      status: mapSubscriptionStatus(subscription.status),
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
  const sub = await db.subscription.findFirst({
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

  const sub = await db.subscription.findFirst({
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
