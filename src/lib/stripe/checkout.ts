import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";

export async function createCheckoutSession({
  priceId,
  userId,
  userEmail,
  mode,
  successUrl,
  cancelUrl,
  metadata,
}: {
  priceId: string;
  userId: string;
  userEmail: string;
  mode: "payment" | "subscription";
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  // Reuse existing Stripe customer if available (prevents duplicate customers)
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  const customerParams: { customer?: string; customer_email?: string } =
    user?.stripeCustomerId
      ? { customer: user.stripeCustomerId }
      : { customer_email: userEmail };

  const session = await stripe.checkout.sessions.create({
    mode,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    ...customerParams,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      ...metadata,
    },
    allow_promotion_codes: true,
  });

  return session;
}
