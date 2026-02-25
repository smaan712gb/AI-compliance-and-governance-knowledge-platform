import { NextRequest, NextResponse } from "next/server";
import { boardReportSchema } from "@/lib/validators/board-report";
import { buildBoardReportPrompt, BOARD_REPORT_SYSTEM_PROMPT } from "@/lib/ai/board-report-prompts";
import { deepseek } from "@/lib/deepseek";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkFeatureAccess, incrementUsage } from "@/lib/feature-gating";
import { estimateCost } from "@/lib/agents/types";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "You must be signed in to generate board reports." } },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const access = await checkFeatureAccess(userId, "board_report");
    if (!access.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FEATURE_LOCKED",
            message: access.upgradeRequired
              ? `Board report generation requires a Professional or Enterprise plan. You are on the ${access.tier} tier.`
              : `You've reached your monthly limit (${access.used}/${access.limit}). Upgrade for more.`,
            tier: access.tier,
          },
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = boardReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    // Aggregate context from user's DB data
    const company = await db.companyProfile.findUnique({ where: { userId } });
    let dbContext: Parameters<typeof buildBoardReportPrompt>[1] = undefined;

    if (company) {
      const periodStart = new Date(parsed.data.periodStart);
      const periodEnd = new Date(parsed.data.periodEnd);

      const [alerts, vendorAssessments, risks, aiSystems] = await Promise.all([
        db.regulatoryAlert.findMany({
          where: { createdAt: { gte: periodStart, lte: periodEnd }, isActive: true },
          select: { urgency: true },
        }),
        db.vendorAssessment.count({
          where: { createdAt: { gte: periodStart, lte: periodEnd } },
        }),
        db.risk.count({ where: { companyId: company.id, status: { not: "CLOSED" } } }),
        db.aISystem.count({ where: { companyId: company.id, status: "ACTIVE" } }),
      ]);

      const alertsByUrgency: Record<string, number> = {};
      alerts.forEach((a) => { alertsByUrgency[a.urgency] = (alertsByUrgency[a.urgency] || 0) + 1; });

      dbContext = {
        alertCount: alerts.length,
        alertsByUrgency,
        vendorAssessmentCount: vendorAssessments,
        riskCount: risks,
        aiSystemCount: aiSystems,
        companyName: company.companyName,
        industry: company.industry,
      };
    }

    const prompt = buildBoardReportPrompt(parsed.data, dbContext);
    const encoder = new TextEncoder();
    let fullContent = "";
    let inputTokens = 0;
    let outputTokens = 0;

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = await deepseek.chat.completions.create({
            model: "deepseek-chat",
            messages: [
              { role: "system", content: BOARD_REPORT_SYSTEM_PROMPT },
              { role: "user", content: prompt },
            ],
            stream: true,
            temperature: 0.4,
            max_tokens: 10000,
          });

          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
              fullContent += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
            if (chunk.usage) {
              inputTokens = chunk.usage.prompt_tokens || 0;
              outputTokens = chunk.usage.completion_tokens || 0;
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();

          try {
            const cost = estimateCost(inputTokens, outputTokens, "deepseek-chat");

            await db.boardReport.create({
              data: {
                userId,
                companyId: company?.id || null,
                reportType: parsed.data.reportType,
                periodStart: new Date(parsed.data.periodStart),
                periodEnd: new Date(parsed.data.periodEnd),
                focusAreas: parsed.data.focusAreas,
                audience: parsed.data.audience || null,
                aiResponse: fullContent,
                tokensUsed: inputTokens + outputTokens,
                costUsd: cost,
              },
            });

            if (company) await incrementUsage(company.id, "board_report");
          } catch (dbError) {
            console.error("[Board Report] Failed to save:", dbError instanceof Error ? dbError.message : String(dbError));
          }
        } catch (streamError) {
          const errMsg = streamError instanceof Error ? streamError.message : String(streamError);
          console.error("[Board Report] Stream error:", errMsg);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `Board report generation failed: ${errMsg}` })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Board Report] Error:", message);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: `Failed to generate report: ${message}` } },
      { status: 500 }
    );
  }
}
