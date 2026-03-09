import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { generateApiKey } from "@/lib/sentinel/api-auth";
import { getUserSentinelTier } from "@/lib/sentinel/feature-gating";

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tier = await getUserSentinelTier(session.user.id);
    if (tier === "FREE") {
      return NextResponse.json(
        { error: "API keys require Pro tier or above" },
        { status: 403 }
      );
    }

    const keys = await db.sentinelApiKey.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        prefix: true,
        tier: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: keys });
  } catch (error) {
    console.error("[Sentinel API Keys] GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tier = await getUserSentinelTier(session.user.id);
    if (tier === "FREE") {
      return NextResponse.json(
        { error: "API keys require Pro tier or above" },
        { status: 403 }
      );
    }

    // Max 5 keys per user
    const existingCount = await db.sentinelApiKey.count({
      where: { userId: session.user.id, isActive: true },
    });
    if (existingCount >= 5) {
      return NextResponse.json(
        { error: "Maximum 5 active API keys allowed. Deactivate an existing key first." },
        { status: 409 }
      );
    }

    const body = await req.json();
    const parsed = createKeySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { key, hash, prefix } = generateApiKey();

    await db.sentinelApiKey.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name,
        keyHash: hash,
        prefix,
        tier: tier,
      },
    });

    // Return the full key only once — it can never be retrieved again
    return NextResponse.json({
      data: {
        key,
        name: parsed.data.name,
        prefix,
        tier,
        message: "Save this key — it will not be shown again.",
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[Sentinel API Keys] POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const keyId = searchParams.get("id");

    if (!keyId) {
      return NextResponse.json({ error: "Missing key ID" }, { status: 400 });
    }

    // Verify ownership
    const apiKey = await db.sentinelApiKey.findFirst({
      where: { id: keyId, userId: session.user.id },
    });

    if (!apiKey) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    await db.sentinelApiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });

    return NextResponse.json({ data: { deactivated: true } });
  } catch (error) {
    console.error("[Sentinel API Keys] DELETE error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
