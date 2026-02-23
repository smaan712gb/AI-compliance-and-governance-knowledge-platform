import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserTier, getTierLimits } from "@/lib/feature-gating";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const company = await db.companyProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!company) {
      return NextResponse.json({ data: null });
    }

    const tier = await getUserTier(session.user.id);
    const limits = getTierLimits(tier);

    return NextResponse.json({ data: company, tier, limits });
  } catch (error) {
    console.error("Get company error:", error);
    return NextResponse.json(
      { error: "Failed to fetch company profile" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if profile already exists
    const existing = await db.companyProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Company profile already exists. Use PUT to update." },
        { status: 409 },
      );
    }

    const body = await request.json();

    const {
      companyName,
      industry,
      companySize,
      headquarters,
      operatingCountries,
      erpSystem,
      complianceDomains,
      annualRevenue,
    } = body;

    if (!companyName || !industry || !companySize || !headquarters) {
      return NextResponse.json(
        { error: "Missing required fields: companyName, industry, companySize, headquarters" },
        { status: 400 },
      );
    }

    // Enforce jurisdiction limit based on tier
    const tier = await getUserTier(session.user.id);
    const limits = getTierLimits(tier);
    const countries = operatingCountries || [headquarters];

    if (limits.jurisdictions !== -1 && countries.length > limits.jurisdictions) {
      return NextResponse.json(
        {
          error: `Your ${tier} plan allows ${limits.jurisdictions} jurisdiction(s). Upgrade for more.`,
          upgradeRequired: true,
        },
        { status: 403 },
      );
    }

    const company = await db.companyProfile.create({
      data: {
        userId: session.user.id,
        companyName,
        industry,
        companySize,
        headquarters,
        operatingCountries: countries,
        erpSystem: erpSystem || null,
        complianceDomains: complianceDomains || [],
        annualRevenue: annualRevenue || null,
        onboardingComplete: true,
      },
    });

    return NextResponse.json({ data: company }, { status: 201 });
  } catch (error) {
    console.error("Create company error:", error);
    return NextResponse.json(
      { error: "Failed to create company profile" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await db.companyProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "No company profile found. Use POST to create." },
        { status: 404 },
      );
    }

    const body = await request.json();

    // Enforce jurisdiction limit on update
    if (body.operatingCountries) {
      const tier = await getUserTier(session.user.id);
      const limits = getTierLimits(tier);
      if (
        limits.jurisdictions !== -1 &&
        body.operatingCountries.length > limits.jurisdictions
      ) {
        return NextResponse.json(
          {
            error: `Your ${tier} plan allows ${limits.jurisdictions} jurisdiction(s). Upgrade for more.`,
            upgradeRequired: true,
          },
          { status: 403 },
        );
      }
    }

    const company = await db.companyProfile.update({
      where: { userId: session.user.id },
      data: {
        ...(body.companyName && { companyName: body.companyName }),
        ...(body.industry && { industry: body.industry }),
        ...(body.companySize && { companySize: body.companySize }),
        ...(body.headquarters && { headquarters: body.headquarters }),
        ...(body.operatingCountries && { operatingCountries: body.operatingCountries }),
        ...(body.erpSystem !== undefined && { erpSystem: body.erpSystem }),
        ...(body.complianceDomains && { complianceDomains: body.complianceDomains }),
        ...(body.annualRevenue !== undefined && { annualRevenue: body.annualRevenue }),
      },
    });

    return NextResponse.json({ data: company });
  } catch (error) {
    console.error("Update company error:", error);
    return NextResponse.json(
      { error: "Failed to update company profile" },
      { status: 500 },
    );
  }
}
