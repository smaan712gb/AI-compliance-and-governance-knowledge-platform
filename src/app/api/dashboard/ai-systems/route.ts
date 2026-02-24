import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiSystemSchema } from "@/lib/validators/ai-system";
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

    const systems = await db.aISystem.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: systems, total: systems.length });
  } catch (error) {
    console.error("[AI Systems] GET error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Failed to fetch AI systems" }, { status: 500 });
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
      return NextResponse.json({ error: "Company profile required. Complete onboarding first." }, { status: 400 });
    }

    const access = await checkFeatureAccess(userId, "ai_system");
    if (!access.allowed) {
      return NextResponse.json(
        {
          error: access.upgradeRequired
            ? `AI System Inventory requires a Starter or higher plan. You are on the ${access.tier} tier.`
            : `You've reached your limit (${access.used}/${access.limit}). Upgrade for more.`,
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = aiSystemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const system = await db.aISystem.create({
      data: {
        companyId: company.id,
        name: parsed.data.name,
        description: parsed.data.description,
        purpose: parsed.data.purpose || null,
        modelType: parsed.data.modelType || null,
        modelProvider: parsed.data.modelProvider || null,
        dataClassification: parsed.data.dataClassification || null,
        riskLevel: parsed.data.riskLevel || null,
        department: parsed.data.department || null,
        owner: parsed.data.owner || null,
        status: parsed.data.status || "ACTIVE",
        deploymentDate: parsed.data.deploymentDate ? new Date(parsed.data.deploymentDate) : null,
        dataSources: parsed.data.dataSources || [],
        outputTypes: parsed.data.outputTypes || [],
        affectedPersons: parsed.data.affectedPersons || [],
        humanOversight: parsed.data.humanOversight || null,
      },
    });

    await incrementUsage(company.id, "ai_system");
    return NextResponse.json({ data: system }, { status: 201 });
  } catch (error) {
    console.error("[AI Systems] POST error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Failed to create AI system" }, { status: 500 });
  }
}
