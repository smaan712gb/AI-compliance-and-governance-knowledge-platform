import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";
import { screenEntity } from "@/lib/sentinel/sanctions-screener";
import { validateApiKey } from "@/lib/sentinel/api-auth";
import { getUserSentinelTier } from "@/lib/sentinel/feature-gating";
import { checkRateLimit } from "@/lib/sentinel/rate-limiter";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const screeningSchema = z.object({
  name: z.string().min(1).max(300),
  entityType: z.enum(["person", "organization", "vessel", "aircraft"]),
  countryCode: z.string().max(5).optional(),
  dateOfBirth: z.string().max(20).optional(),
  nationality: z.string().max(5).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Auth
    let userId: string | undefined;
    let tier: import("@/lib/sentinel/types").SentinelTier = "FREE";

    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("stl_") || authHeader?.includes("stl_")) {
      const validation = await validateApiKey(authHeader);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 401 });
      }
      userId = validation.userId;
      tier = validation.tier!;
    } else {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = session.user.id;
      tier = await getUserSentinelTier(userId);
    }

    // Rate limit
    const rateLimit = await checkRateLimit(userId!, tier, "screening");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", remaining: 0 },
        { status: 429 }
      );
    }

    // Parse
    const body = await req.json();
    const parsed = screeningSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Screen
    const result = await screenEntity(parsed.data);

    // Persist result
    await db.screeningResult.create({
      data: {
        userId: userId!,
        entityName: result.entityName,
        entityType: result.entityType,
        countryCode: parsed.data.countryCode,
        sanctionsScore: result.sanctionsScore,
        pepScore: result.pepScore,
        adverseMediaScore: result.adverseMediaScore,
        geographicRiskScore: result.geographicRiskScore,
        compositeScore: result.compositeScore,
        recommendation: result.recommendation === "block"
          ? "BLOCK"
          : result.recommendation === "enhanced_due_diligence"
          ? "ENHANCED_DUE_DILIGENCE"
          : result.recommendation === "standard"
          ? "STANDARD"
          : "CLEAR",
        sanctionsMatches: result.sanctionsMatches as unknown as Prisma.InputJsonValue,
        pepMatches: result.pepMatches as unknown as Prisma.InputJsonValue,
        adverseMediaHits: result.adverseMediaHits as unknown as Prisma.InputJsonValue,
        details: { riskFactors: result.riskFactors } as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[Sentinel Screening] Error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Number(searchParams.get("limit")) || 20);

    const results = await db.screeningResult.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("[Sentinel Screening] GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
