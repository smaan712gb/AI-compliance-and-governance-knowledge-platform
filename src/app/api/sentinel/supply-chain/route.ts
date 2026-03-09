import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { assessSupplierRisk, analyzePortfolio } from "@/lib/sentinel/supply-chain";
import type { SupplierProfile } from "@/lib/sentinel/types";
import { validateApiKey } from "@/lib/sentinel/api-auth";
import { getUserSentinelTier, checkFeatureAccess } from "@/lib/sentinel/feature-gating";

export const dynamic = "force-dynamic";

// ---- Schemas ----

const registerSupplierSchema = z.object({
  name: z.string().min(1).max(200),
  countryCode: z.string().min(2).max(5),
  sector: z.string().min(1).max(100),
  tier: z.number().int().min(1).max(5).default(1),
  criticality: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  description: z.string().max(1000).optional(),
  dependsOnCountries: z.array(z.string().min(2).max(5)).default([]),
  shippingRoutes: z.array(z.string()).default([]),
});

const adHocSchema = z.object({
  suppliers: z.array(z.object({
    name: z.string().min(1).max(200),
    countryCode: z.string().min(2).max(5),
    tier: z.number().int().min(1).max(5),
    criticality: z.enum(["critical", "high", "medium", "low"]),
    sector: z.string().min(1).max(100),
  })).min(1).max(100),
  mode: z.enum(["single", "portfolio"]).default("single"),
});

// ---- Auth Helper ----

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("stl_") || authHeader?.includes("stl_")) {
    const validation = await validateApiKey(authHeader);
    if (!validation.valid) return null;
    return { userId: validation.userId!, tier: validation.tier! };
  }
  const session = await auth();
  if (!session?.user?.id) return null;
  const tier = await getUserSentinelTier(session.user.id);
  return { userId: session.user.id, tier };
}

// ---- GET: List org suppliers + live risk data + recent alerts ----

export async function GET(req: NextRequest) {
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("organizationId");

  if (!orgId) {
    return NextResponse.json({ error: "organizationId required" }, { status: 400 });
  }

  // Verify membership
  const membership = await db.sentinelOrgMember.findFirst({
    where: { organizationId: orgId, userId: user.userId, isActive: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
  }

  const [suppliers, recentAlerts, portfolioStats] = await Promise.all([
    db.sentinelSupplier.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { currentRiskScore: "desc" },
    }),
    db.supplyChainAlert.findMany({
      where: {
        supplier: { organizationId: orgId },
      },
      include: {
        supplier: { select: { name: true, countryCode: true } },
        event: { select: { headline: true, severity: true, category: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    // Aggregate stats
    db.sentinelSupplier.groupBy({
      by: ["riskLevel"],
      where: { organizationId: orgId, isActive: true },
      _count: true,
    }),
  ]);

  // Run live portfolio analysis
  const supplierProfiles: SupplierProfile[] = suppliers.map((s) => ({
    name: s.name,
    countryCode: s.countryCode,
    sector: s.sector,
    tier: s.tier,
    criticality: s.criticality as "critical" | "high" | "medium" | "low",
  }));

  const portfolio = suppliers.length > 0 ? analyzePortfolio(supplierProfiles) : null;

  return NextResponse.json({
    data: {
      suppliers,
      recentAlerts,
      portfolio,
      stats: {
        total: suppliers.length,
        riskBreakdown: Object.fromEntries(
          portfolioStats.map((s) => [s.riskLevel, s._count])
        ),
        unreadAlerts: recentAlerts.filter((a) => !a.isRead).length,
      },
    },
  });
}

// ---- POST: Register supplier OR run ad-hoc analysis ----

export async function POST(req: NextRequest) {
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!checkFeatureAccess(user.tier, "supplyChain")) {
    return NextResponse.json(
      { error: "Supply chain analysis requires Expert or Strategic tier" },
      { status: 403 },
    );
  }

  const body = await req.json();

  // Route: ad-hoc analysis (legacy)
  if (body.suppliers && body.mode) {
    const parsed = adHocSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 });
    }
    const suppliers = parsed.data.suppliers as SupplierProfile[];
    if (parsed.data.mode === "portfolio" || suppliers.length > 1) {
      return NextResponse.json({ data: { portfolio: analyzePortfolio(suppliers), assessments: suppliers.map(assessSupplierRisk) } });
    }
    return NextResponse.json({ data: assessSupplierRisk(suppliers[0]) });
  }

  // Route: register persistent supplier
  const parsed = registerSupplierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid supplier data", details: parsed.error.issues }, { status: 400 });
  }

  const orgId = body.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: "organizationId required" }, { status: 400 });
  }

  // Verify membership
  const membership = await db.sentinelOrgMember.findFirst({
    where: { organizationId: orgId, userId: user.userId, isActive: true, role: { in: ["ADMIN", "MANAGER"] } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Admin/Manager access required" }, { status: 403 });
  }

  // Assess risk immediately
  const profile: SupplierProfile = {
    name: parsed.data.name,
    countryCode: parsed.data.countryCode.toUpperCase(),
    sector: parsed.data.sector,
    tier: parsed.data.tier,
    criticality: parsed.data.criticality,
  };
  const assessment = assessSupplierRisk(profile);

  const supplier = await db.sentinelSupplier.upsert({
    where: {
      organizationId_name: {
        organizationId: orgId,
        name: parsed.data.name,
      },
    },
    create: {
      organizationId: orgId,
      name: parsed.data.name,
      countryCode: parsed.data.countryCode.toUpperCase(),
      sector: parsed.data.sector,
      tier: parsed.data.tier,
      criticality: parsed.data.criticality,
      description: parsed.data.description,
      dependsOnCountries: parsed.data.dependsOnCountries.map((c) => c.toUpperCase()),
      shippingRoutes: parsed.data.shippingRoutes,
      currentRiskScore: assessment.compositeRisk,
      riskLevel: assessment.riskLevel,
      lastAssessedAt: new Date(),
    },
    update: {
      countryCode: parsed.data.countryCode.toUpperCase(),
      sector: parsed.data.sector,
      tier: parsed.data.tier,
      criticality: parsed.data.criticality,
      description: parsed.data.description,
      dependsOnCountries: parsed.data.dependsOnCountries.map((c) => c.toUpperCase()),
      shippingRoutes: parsed.data.shippingRoutes,
      currentRiskScore: assessment.compositeRisk,
      riskLevel: assessment.riskLevel,
      lastAssessedAt: new Date(),
    },
  });

  return NextResponse.json({
    data: { supplier, assessment },
  }, { status: 201 });
}

// ---- DELETE: Remove supplier ----

export async function DELETE(req: NextRequest) {
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get("id");
  if (!supplierId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supplier = await db.sentinelSupplier.findUnique({
    where: { id: supplierId },
    include: { organization: { include: { members: { where: { userId: user.userId, isActive: true } } } } },
  });

  if (!supplier || supplier.organization.members.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.sentinelSupplier.update({
    where: { id: supplierId },
    data: { isActive: false },
  });

  return NextResponse.json({ status: "deleted" });
}
