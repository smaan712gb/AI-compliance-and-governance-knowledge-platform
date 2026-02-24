import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { checkFeatureAccess, incrementUsage } from "@/lib/feature-gating";
import { deepseek } from "@/lib/deepseek";
import { RISK_ANALYSIS_SYSTEM_PROMPT, buildRiskAnalysisPrompt } from "@/lib/ai/risk-analysis-prompts";
import { estimateCost } from "@/lib/agents/types";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const access = await checkFeatureAccess(userId, "risk_analysis");
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.upgradeRequired
            ? `Risk Analysis requires a Professional or Enterprise plan.`
            : `You've reached your monthly limit (${access.used}/${access.limit}).` },
        { status: 403 }
      );
    }

    const { riskId } = await req.json();
    if (!riskId) return NextResponse.json({ error: "riskId is required" }, { status: 400 });

    const company = await db.companyProfile.findUnique({ where: { userId } });
    if (!company) return NextResponse.json({ error: "Company profile required" }, { status: 400 });

    const risk = await db.risk.findFirst({ where: { id: riskId, companyId: company.id } });
    if (!risk) return NextResponse.json({ error: "Risk not found" }, { status: 404 });

    const prompt = buildRiskAnalysisPrompt(risk);

    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: RISK_ANALYSIS_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content || "";
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const cost = estimateCost(inputTokens, outputTokens, "deepseek-chat");

    let analysis: Record<string, unknown> = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) analysis = JSON.parse(jsonMatch[0]);
    } catch {
      analysis = { rawResponse: content };
    }

    // Save as RiskAssessment
    await db.riskAssessment.create({
      data: {
        riskId,
        analysis: analysis as unknown as Prisma.InputJsonValue,
        tokensUsed: inputTokens + outputTokens,
        costUsd: cost,
      },
    });

    // Update risk residual score if available
    const residual = analysis.riskAssessment && typeof analysis.riskAssessment === "object"
      ? (analysis.riskAssessment as Record<string, unknown>).residualRisk
      : null;
    if (residual && typeof residual === "object") {
      const r = residual as Record<string, number>;
      if (r.score) {
        await db.risk.update({
          where: { id: riskId },
          data: { residualScore: r.score, reviewDate: new Date() },
        });
      }
    }

    await incrementUsage(company.id, "risk_analysis");

    return NextResponse.json({ success: true, data: analysis, tokensUsed: inputTokens + outputTokens, costUsd: cost });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Risk Analysis] Error:", message);
    return NextResponse.json({ error: `Failed to analyze risk: ${message}` }, { status: 500 });
  }
}
