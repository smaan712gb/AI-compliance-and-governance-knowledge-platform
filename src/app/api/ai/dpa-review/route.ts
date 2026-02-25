import { NextRequest, NextResponse } from "next/server";
import { dpaReviewSchema } from "@/lib/validators/privacy-ops";
import { buildDPAReviewPrompt, DPA_REVIEW_SYSTEM_PROMPT } from "@/lib/ai/privacy-ops-prompts";
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
        { success: false, error: { code: "UNAUTHORIZED", message: "You must be signed in to use DPA review." } },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const access = await checkFeatureAccess(userId, "dpa_review");
    if (!access.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FEATURE_LOCKED",
            message: access.upgradeRequired
              ? `DPA review requires a Starter or higher plan. You are on the ${access.tier} tier.`
              : `You've reached your monthly limit (${access.used}/${access.limit}). Upgrade for more.`,
            tier: access.tier,
          },
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = dpaReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const prompt = buildDPAReviewPrompt(parsed.data);
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
              { role: "system", content: DPA_REVIEW_SYSTEM_PROMPT },
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
            if (company) await incrementUsage(company.id, "dpa_review");
          } catch (dbError) {
            console.error("[DPA Review] Failed to save:", dbError instanceof Error ? dbError.message : String(dbError));
          }
        } catch (streamError) {
          const errMsg = streamError instanceof Error ? streamError.message : String(streamError);
          console.error("[DPA Review] Stream error:", errMsg);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `DPA review failed: ${errMsg}` })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[DPA Review] Error:", message);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: `Failed to review DPA: ${message}` } },
      { status: 500 }
    );
  }
}
