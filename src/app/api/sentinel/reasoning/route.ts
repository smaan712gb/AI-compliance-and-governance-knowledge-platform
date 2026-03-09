import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";
import { analyzeEvent } from "@/lib/sentinel/reasoning";
import { auditBias } from "@/lib/sentinel/bias-detector";
import { validateApiKey } from "@/lib/sentinel/api-auth";
import { getUserSentinelTier } from "@/lib/sentinel/feature-gating";
import { checkRateLimit } from "@/lib/sentinel/rate-limiter";

const reasoningSchema = z.object({
  headline: z.string().min(1).max(500),
  content: z.string().min(1).max(10000),
  source: z.string().max(200).optional(),
  countryCode: z.string().max(5).optional(),
  context: z.string().max(2000).optional(),
  includeBiasAudit: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Auth: session or API key
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
    const rateLimit = await checkRateLimit(userId!, tier, "reasoning");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          resetAt: rateLimit.resetAt.toISOString(),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
          },
        }
      );
    }

    // Parse body
    const body = await req.json();
    const parsed = reasoningSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { includeBiasAudit, ...reasoningRequest } = parsed.data;

    // Run reasoning
    const reasoning = await analyzeEvent(reasoningRequest);

    // Optional bias audit (PRO+ only)
    let biasAudit = null;
    if (includeBiasAudit && tier !== "FREE") {
      biasAudit = await auditBias({
        headline: reasoningRequest.headline,
        content: reasoningRequest.content,
        source: reasoningRequest.source || "Unknown",
        region: reasoningRequest.countryCode,
      });
    }

    return NextResponse.json({
      data: {
        reasoning,
        biasAudit,
      },
    }, {
      headers: {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    });
  } catch (error) {
    console.error("[Sentinel Reasoning] Error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
