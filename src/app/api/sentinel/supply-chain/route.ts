import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";
import { assessSupplierRisk, analyzePortfolio } from "@/lib/sentinel/supply-chain";
import type { SupplierProfile } from "@/lib/sentinel/types";
import { validateApiKey } from "@/lib/sentinel/api-auth";
import { getUserSentinelTier, checkFeatureAccess } from "@/lib/sentinel/feature-gating";
import { checkRateLimit } from "@/lib/sentinel/rate-limiter";

const supplierSchema: z.ZodType = z.object({
  name: z.string().min(1).max(200),
  countryCode: z.string().min(2).max(5),
  tier: z.number().int().min(1).max(5),
  criticality: z.enum(["critical", "high", "medium", "low"]),
  sector: z.string().min(1).max(100),
  upstream: z.array(z.lazy(() => supplierSchema)).optional(),
});

const portfolioSchema = z.object({
  suppliers: z.array(supplierSchema).min(1).max(100),
  mode: z.enum(["single", "portfolio"]).default("single"),
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

    // Feature gate: EXPERT+ only
    if (!checkFeatureAccess(tier, "supplyChain")) {
      return NextResponse.json(
        { error: "Supply chain analysis requires Expert or Strategic tier" },
        { status: 403 }
      );
    }

    // Rate limit
    const rateLimit = await checkRateLimit(userId!, tier, "supply-chain");
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    // Parse
    const body = await req.json();
    const parsed = portfolioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { suppliers: rawSuppliers, mode } = parsed.data;
    const suppliers = rawSuppliers as SupplierProfile[];

    if (mode === "portfolio" || suppliers.length > 1) {
      const portfolio = analyzePortfolio(suppliers);
      const assessments = suppliers.map(assessSupplierRisk);
      return NextResponse.json({
        data: {
          portfolio,
          assessments,
        },
      });
    }

    // Single supplier
    const assessment = assessSupplierRisk(suppliers[0]);
    return NextResponse.json({ data: assessment });
  } catch (error) {
    console.error("[Sentinel Supply Chain] Error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
