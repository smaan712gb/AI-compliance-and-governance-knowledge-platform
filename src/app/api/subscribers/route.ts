import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscribeSchema } from "@/lib/validators/subscriber";
import { startSequence } from "@/lib/email/sequences";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = subscribeSchema.parse(body);

    const existing = await db.subscriber.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      if (existing.status === "UNSUBSCRIBED") {
        await db.subscriber.update({
          where: { id: existing.id },
          data: { status: "ACTIVE", unsubscribedAt: null },
        });
        return NextResponse.json({ success: true, message: "Welcome back!" });
      }
      return NextResponse.json({ success: true, message: "Already subscribed" });
    }

    const subscriber = await db.subscriber.create({
      data: {
        email: data.email,
        name: data.name,
        source: data.source,
        tags: data.tags || [],
        status: "ACTIVE",
      },
    });

    // Start welcome drip sequence
    const welcomeSequence = await db.emailSequence.findFirst({
      where: { name: "Welcome Sequence", isActive: true },
    });
    if (welcomeSequence) {
      await startSequence(subscriber.id, welcomeSequence.id);
    }

    return NextResponse.json({ success: true, message: "Successfully subscribed!" });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    console.error("Subscribe error:", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
