import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  try {
    const subscriber = await db.subscriber.findUnique({ where: { email } });
    if (!subscriber) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.subscriber.update({
      where: { id: subscriber.id },
      data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
    });

    // Pause all active sequences
    await db.sequenceProgress.updateMany({
      where: { subscriberId: subscriber.id, status: "ACTIVE" },
      data: { status: "PAUSED" },
    });

    return NextResponse.json({ success: true, message: "Successfully unsubscribed" });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
}
