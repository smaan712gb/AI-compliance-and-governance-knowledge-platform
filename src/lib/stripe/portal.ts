import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";

export async function createPortalSession(userId: string, returnUrl: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.stripeCustomerId) {
    throw new Error("No Stripe customer found for this user");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: returnUrl,
  });

  return session;
}
