import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPortalSession } from "@/lib/stripe/portal";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const portalSession = await createPortalSession(
      session.user.id,
      `${siteUrl}/dashboard/subscription`
    );

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Portal error:", message);
    if (message.includes("No Stripe customer")) {
      return NextResponse.json({ error: "No active subscription found. Subscribe to a plan first." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
  }
}
