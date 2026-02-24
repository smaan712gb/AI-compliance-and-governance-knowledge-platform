import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { checkFeatureAccess, incrementUsage } from "@/lib/feature-gating";
import { deepseek } from "@/lib/deepseek";
import { AI_SYSTEM_ANALYSIS_SYSTEM_PROMPT, buildAISystemAnalysisPrompt } from "@/lib/ai/ai-system-prompts";
import { estimateCost } from "@/lib/agents/types";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const access = await checkFeatureAccess(userId, "ai_system_analysis");
    if (!access.allowed) {
      return NextResponse.json(
        {
          error: access.upgradeRequired
            ? `AI System Analysis requires a Professional or Enterprise plan. You are on the ${access.tier} tier.`
            : `You've reached your monthly limit (${access.used}/${access.limit}).`,
        },
        { status: 403 }
      );
    }

    const { systemId } = await req.json();
    if (!systemId) {
      return NextResponse.json({ error: "systemId is required" }, { status: 400 });
    }

    const company = await db.companyProfile.findUnique({ where: { userId } });
    if (!company) {
      return NextResponse.json({ error: "Company profile required" }, { status: 400 });
    }

    const system = await db.aISystem.findFirst({ where: { id: systemId, companyId: company.id } });
    if (!system) {
      return NextResponse.json({ error: "AI system not found" }, { status: 404 });
    }

    const prompt = buildAISystemAnalysisPrompt(system);

    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: AI_SYSTEM_ANALYSIS_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content || "";
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const cost = estimateCost(inputTokens, outputTokens, "deepseek-chat");

    // Parse JSON response
    let analysis: Record<string, unknown> = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }
    } catch {
      analysis = { rawResponse: content };
    }

    // Save analysis to the AI system record
    await db.aISystem.update({
      where: { id: systemId },
      data: {
        aiAnalysis: analysis as unknown as Prisma.InputJsonValue,
        riskLevel: analysis.riskClassification && typeof analysis.riskClassification === "object"
          ? ((analysis.riskClassification as Record<string, string>).level as "UNACCEPTABLE" | "HIGH" | "LIMITED" | "MINIMAL" | "GPAI" | "GPAI_SYSTEMIC") || system.riskLevel
          : system.riskLevel,
        lastReviewDate: new Date(),
        tokensUsed: { increment: inputTokens + outputTokens },
        costUsd: { increment: cost },
      },
    });

    await incrementUsage(company.id, "ai_system_analysis");

    return NextResponse.json({
      success: true,
      data: analysis,
      tokensUsed: inputTokens + outputTokens,
      costUsd: cost,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[AI System Analysis] Error:", message);
    return NextResponse.json({ error: `Failed to analyze: ${message}` }, { status: 500 });
  }
}
