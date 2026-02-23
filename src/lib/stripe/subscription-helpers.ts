import { db } from "@/lib/db";
import type { Tier } from "@/lib/feature-gating";

export async function getUserSubscription(userId: string) {
  return db.subscription.findUnique({
    where: { userId },
  });
}

export async function getUserTier(userId: string): Promise<Tier> {
  const sub = await getUserSubscription(userId);
  if (!sub || (sub.status !== "ACTIVE" && sub.status !== "TRIALING")) {
    return "free";
  }

  const priceMap: Record<string, Tier> = {};
  const starter = process.env.STRIPE_PRICE_SUB_STARTER;
  const pro = process.env.STRIPE_PRICE_SUB_PRO;
  const enterprise = process.env.STRIPE_PRICE_SUB_ENTERPRISE;
  if (starter) priceMap[starter] = "starter";
  if (pro) priceMap[pro] = "professional";
  if (enterprise) priceMap[enterprise] = "enterprise";

  return priceMap[sub.stripePriceId] || "free";
}

export async function hasActiveSubscription(userId: string) {
  const sub = await getUserSubscription(userId);
  return sub?.status === "ACTIVE" || sub?.status === "TRIALING";
}

export async function getSubscriptionPriceId(userId: string) {
  const sub = await getUserSubscription(userId);
  if (!sub || (sub.status !== "ACTIVE" && sub.status !== "TRIALING")) return null;
  return sub.stripePriceId;
}

export async function hasProductAccess(userId: string, productId: string) {
  const purchase = await db.purchase.findFirst({
    where: { userId, productId, status: "COMPLETED" },
  });
  return !!purchase;
}

export async function getUserPurchases(userId: string) {
  return db.purchase.findMany({
    where: { userId, status: "COMPLETED" },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });
}
