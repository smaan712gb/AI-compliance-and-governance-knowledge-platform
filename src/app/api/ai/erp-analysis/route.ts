import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkFeatureAccess, incrementUsage } from "@/lib/feature-gating";
import { db } from "@/lib/db";
import { deepseek } from "@/lib/deepseek";
import {
  ERP_ANALYSIS_SYSTEM_PROMPT,
  buildERPAnalysisUserPrompt,
} from "@/lib/agents/erp-analysis-prompts";
import { analyzeERPGaps, ERP_SYSTEMS } from "@/lib/constants/erp-data";
import { estimateCost } from "@/lib/agents/types";

export async function POST(req: NextRequest) {
  try {
    // ---- Auth required ----
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be signed in to use ERP analysis.",
          },
        },
        { status: 401 },
      );
    }

    const userId = session.user.id;

    // ---- Feature gating: professional+ tier ----
    const access = await checkFeatureAccess(userId, "erp_analysis");
    if (!access.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FEATURE_LOCKED",
            message: access.upgradeRequired
              ? `ERP analysis requires a Professional or Enterprise plan. You are on the ${access.tier} tier.`
              : `You have reached your monthly ERP analysis limit (${access.used}/${access.limit}). Upgrade for more.`,
            tier: access.tier,
            limit: access.limit,
            used: access.used,
          },
        },
        { status: 403 },
      );
    }

    // ---- Parse & validate request body ----
    const body = await req.json();
    const { erpSystem, countries, industry } = body as {
      erpSystem?: string;
      countries?: string[];
      industry?: string;
    };

    if (!erpSystem || typeof erpSystem !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "erpSystem is required and must be a string.",
          },
        },
        { status: 400 },
      );
    }

    if (
      !countries ||
      !Array.isArray(countries) ||
      countries.length === 0 ||
      !countries.every((c: unknown) => typeof c === "string")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "countries is required and must be a non-empty array of country codes.",
          },
        },
        { status: 400 },
      );
    }

    if (!industry || typeof industry !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "industry is required and must be a string.",
          },
        },
        { status: 400 },
      );
    }

    // ---- Step 1: Static gap analysis ----
    const staticAnalysis = analyzeERPGaps(erpSystem, countries, industry);

    // ---- Step 2: Fetch relevant vendors ----
    const relevantCategories = [
      "E_INVOICING",
      "TAX_COMPLIANCE",
      "COMPLIANCE_AUTOMATION",
      "GRC_PLATFORM",
      "SECURITY_POSTURE",
      "PRIVACY_COMPLIANCE",
      "ESG_REPORTING",
    ];

    const vendors = await db.vendor.findMany({
      where: {
        isPublished: true,
        category: { in: relevantCategories as never[] },
      },
      select: {
        name: true,
        category: true,
      },
      orderBy: { overallScore: "desc" },
      take: 30,
    });

    const vendorNames = vendors.map(
      (v) => `${v.name} (${v.category.replace(/_/g, " ").toLowerCase()})`,
    );

    // ---- Step 3: Get ERP display name ----
    const erpData = ERP_SYSTEMS[erpSystem];
    const erpSystemName = erpData?.name || erpSystem;

    // ---- Step 4: Build prompts ----
    const userPrompt = buildERPAnalysisUserPrompt(
      erpSystemName,
      countries,
      industry,
      staticAnalysis,
      vendorNames,
    );

    // ---- Step 5: Stream response via SSE ----
    // Send static analysis as first chunk, then stream AI response
    const encoder = new TextEncoder();

    // Variables to track the full response for DB save
    let fullContent = "";
    let inputTokens = 0;
    let outputTokens = 0;

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send static analysis summary as the first event
          const staticSummaryEvent = {
            type: "static_analysis",
            data: {
              erpSystem: {
                id: staticAnalysis.erpSystem.id,
                name: staticAnalysis.erpSystem.name,
                vendor: staticAnalysis.erpSystem.vendor,
              },
              summary: staticAnalysis.summary,
              gaps: staticAnalysis.gaps.map((g) => ({
                regulationId: g.regulationId,
                regulationName: g.regulationName,
                domain: g.domain,
                jurisdiction: g.jurisdiction,
                deadline: g.deadline,
                coverage: g.coverage,
                urgency: g.urgency,
              })),
            },
          };
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify(staticSummaryEvent)}\n\n`,
            ),
          );

          // Stream DeepSeek response
          const stream = await deepseek.chat.completions.create({
            model: "deepseek-chat", // Use chat model for streaming (reasoner doesn't support streaming well)
            messages: [
              { role: "system", content: ERP_ANALYSIS_SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
            stream: true,
            temperature: 0.3,
            max_tokens: 8000,
          });

          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
              fullContent += text;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ text })}\n\n`,
                ),
              );
            }

            // Capture usage from the final chunk if available
            if (chunk.usage) {
              inputTokens = chunk.usage.prompt_tokens || 0;
              outputTokens = chunk.usage.completion_tokens || 0;
            }
          }

          // Send done event
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`),
          );
          controller.close();

          // ---- Post-stream: Save to DB and increment usage ----
          // This runs after the stream is complete
          try {
            const company = await db.companyProfile.findUnique({
              where: { userId },
            });

            const cost = estimateCost(
              inputTokens,
              outputTokens,
              "deepseek-chat",
            );

            await db.eRPAnalysis.create({
              data: {
                companyId: company?.id || null,
                userId,
                erpSystem,
                country: countries[0] || "GLOBAL",
                countries,
                industry,
                regulations: JSON.parse(JSON.stringify(staticAnalysis.applicableRegulations)),
                gapAnalysis: JSON.parse(JSON.stringify(staticAnalysis.gaps)),
                recommendations: [],
                actionPlan: fullContent,
                status: "COMPLETED",
                tokensUsed: inputTokens + outputTokens,
                costUsd: cost,
              },
            });

            // Increment usage counter
            if (company) {
              await incrementUsage(company.id, "erp_analysis");
            }
          } catch (dbError) {
            console.error(
              "[ERP Analysis] Failed to save record:",
              dbError instanceof Error ? dbError.message : String(dbError),
            );
          }
        } catch (streamError) {
          console.error(
            "[ERP Analysis] Stream error:",
            streamError instanceof Error
              ? streamError.message
              : String(streamError),
          );
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "An error occurred during analysis. Please try again." })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      "[ERP Analysis] Error:",
      message,
      error instanceof Error ? error.stack : "",
    );
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: `Failed to run ERP analysis: ${message}`,
        },
      },
      { status: 500 },
    );
  }
}
