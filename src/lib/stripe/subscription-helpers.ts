import { db } from "@/lib/db";

export async function getUserSubscription(userId: string) {
  return db.subscription.findUnique({
    where: { userId },
  });
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
