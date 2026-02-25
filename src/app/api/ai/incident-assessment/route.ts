import { NextRequest, NextResponse } from "next/server";
import { incidentAssessmentSchema } from "@/lib/validators/incident-assessment";
import {
  buildIncidentAssessmentPrompt,
  INCIDENT_ASSESSMENT_SYSTEM_PROMPT,
} from "@/lib/ai/incident-assessment-prompts";
import { deepseek } from "@/lib/deepseek";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkFeatureAccess, incrementUsage } from "@/lib/feature-gating";
import { estimateCost } from "@/lib/agents/types";

export async function POST(req: NextRequest) {
  try {
    // Auth required for incident assessment
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "You must be signed in to use incident assessment." } },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const access = await checkFeatureAccess(userId, "incident_assessment");
    if (!access.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FEATURE_LOCKED",
            message: access.upgradeRequired
              ? `Incident assessment requires a Starter or higher plan. You are on the ${access.tier} tier.`
              : `You've reached your monthly limit (${access.used}/${access.limit}). Upgrade for more.`,
            tier: access.tier,
            limit: access.limit,
            used: access.used,
          },
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = incidentAssessmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const prompt = buildIncidentAssessmentPrompt(parsed.data);
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
              { role: "system", content: INCIDENT_ASSESSMENT_SYSTEM_PROMPT },
              { role: "user", content: prompt },
            ],
            stream: true,
            temperature: 0.3,
            max_tokens: 8000,
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
            const company = await db.companyProfile.findUnique({ where: { userId } });

            await db.incidentAssessment.create({
              data: {
                userId,
                companyId: company?.id || null,
                incidentType: parsed.data.incidentType,
                description: parsed.data.description,
                recordsAffected: parsed.data.recordsAffected || null,
                dataTypesInvolved: parsed.data.dataTypesInvolved || [],
                discoveryDate: parsed.data.discoveryDate ? new Date(parsed.data.discoveryDate) : null,
                containmentDate: parsed.data.containmentDate ? new Date(parsed.data.containmentDate) : null,
                industry: parsed.data.industry || null,
                isPublicCompany: parsed.data.isPublicCompany || false,
                aiResponse: fullContent,
                tokensUsed: inputTokens + outputTokens,
                costUsd: cost,
              },
            });

            if (company) await incrementUsage(company.id, "incident_assessment");
          } catch (dbError) {
            console.error("[Incident Assessment] Failed to save:", dbError instanceof Error ? dbError.message : String(dbError));
          }
        } catch (streamError) {
          const errMsg = streamError instanceof Error ? streamError.message : String(streamError);
          console.error("[Incident Assessment] Stream error:", errMsg);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `Incident assessment failed: ${errMsg}` })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Incident Assessment] Error:", message);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: `Failed to run assessment: ${message}` } },
      { status: 500 }
    );
  }
}
