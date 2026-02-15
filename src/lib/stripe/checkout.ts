import { stripe } from "@/lib/stripe";

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
  const session = await stripe.checkout.sessions.create({
    mode,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: userEmail,
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
