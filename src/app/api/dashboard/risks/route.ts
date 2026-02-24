import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { riskSchema } from "@/lib/validators/risk-register";
import { checkFeatureAccess, incrementUsage } from "@/lib/feature-gating";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const company = await db.companyProfile.findUnique({ where: { userId: session.user.id } });
    if (!company) {
      return NextResponse.json({ data: [], total: 0 });
    }

    const risks = await db.risk.findMany({
      where: { companyId: company.id },
      include: { assessments: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: [{ status: "asc" }, { inherentScore: "desc" }],
    });

    return NextResponse.json({ data: risks, total: risks.length });
  } catch (error) {
    console.error("[Risks] GET error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Failed to fetch risks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const company = await db.companyProfile.findUnique({ where: { userId } });
    if (!company) {
      return NextResponse.json({ error: "Company profile required" }, { status: 400 });
    }

    const access = await checkFeatureAccess(userId, "risk_entry");
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.upgradeRequired
            ? `Risk Register requires a Starter or higher plan.`
            : `You've reached your limit (${access.used}/${access.limit}).` },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = riskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const likelihood = parsed.data.likelihood || 3;
    const impact = parsed.data.impact || 3;

    const risk = await db.risk.create({
      data: {
        companyId: company.id,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        likelihood,
        impact,
        inherentScore: likelihood * impact,
        owner: parsed.data.owner || null,
        status: parsed.data.status || "OPEN",
        mitigations: parsed.data.mitigations || [],
        controls: parsed.data.controls || [],
        targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
      },
    });

    await incrementUsage(company.id, "risk_entry");
    return NextResponse.json({ data: risk }, { status: 201 });
  } catch (error) {
    console.error("[Risks] POST error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Failed to create risk" }, { status: 500 });
  }
}
