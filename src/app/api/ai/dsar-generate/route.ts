import { NextRequest, NextResponse } from "next/server";
import { dsarSchema } from "@/lib/validators/privacy-ops";
import { buildDSARPrompt, DSAR_SYSTEM_PROMPT } from "@/lib/ai/privacy-ops-prompts";
import { deepseek } from "@/lib/deepseek";
import { auth } from "@/lib/auth";
import { checkAIRateLimit } from "@/lib/utils/rate-limit";
import { db } from "@/lib/db";
import { checkFeatureAccess, incrementUsage } from "@/lib/feature-gating";
import { estimateCost } from "@/lib/agents/types";

export async function POST(req: NextRequest) {
  try {
    let userId: string | null = null;
    let userEmail: string | null = null;
    let isAuthenticated = false;
    let isAdmin = false;
    try {
      const session = await auth();
      userId = session?.user?.id || null;
      userEmail = session?.user?.email || null;
      isAuthenticated = !!session?.user;
      isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session?.user?.role || "");
    } catch {
      // Auth failure should not block public tool
    }

    const identifier = userEmail || req.headers.get("x-forwarded-for") || "anonymous";

    try {
      const rateLimit = await checkAIRateLimit(identifier, isAuthenticated, isAdmin);
      if (!rateLimit.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "RATE_LIMIT_EXCEEDED",
              message: `Too many requests. Try again in ${Math.ceil((rateLimit.reset - Date.now()) / 60000)} minutes.`,
            },
          },
          { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.reset - Date.now()) / 1000)) } }
        );
      }
    } catch (rateLimitError) {
      console.warn("Rate limit check failed:", rateLimitError instanceof Error ? rateLimitError.message : String(rateLimitError));
    }

    if (userId) {
      const access = await checkFeatureAccess(userId, "dsar_response");
      if (!access.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FEATURE_LOCKED",
              message: access.upgradeRequired
                ? `You've reached your monthly DSAR response limit (${access.used}/${access.limit}). Upgrade for more.`
                : "DSAR response generation is not available on your current plan.",
              tier: access.tier,
              limit: access.limit,
              used: access.used,
            },
          },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const parsed = dsarSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const prompt = buildDSARPrompt(parsed.data);
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
              { role: "system", content: DSAR_SYSTEM_PROMPT },
              { role: "user", content: prompt },
            ],
            stream: true,
            temperature: 0.3,
            max_tokens: 6000,
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
            let companyId: string | null = null;
            if (userId) {
              const company = await db.companyProfile.findUnique({ where: { userId } });
              companyId = company?.id || null;
              if (company) await incrementUsage(company.id, "dsar_response");
            }

            await db.dSARRequest.create({
              data: {
                userId,
                companyId,
                dsarType: parsed.data.dsarType,
                dataSubjectType: parsed.data.dataSubjectType || null,
                jurisdiction: parsed.data.jurisdiction || null,
                requestDetails: parsed.data.requestDetails,
                aiResponse: fullContent,
                tokensUsed: inputTokens + outputTokens,
                costUsd: cost,
              },
            });
          } catch (dbError) {
            console.error("[DSAR] Failed to save:", dbError instanceof Error ? dbError.message : String(dbError));
          }
        } catch (streamError) {
          const errMsg = streamError instanceof Error ? streamError.message : String(streamError);
          console.error("[DSAR] Stream error:", errMsg);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `DSAR generation failed: ${errMsg}` })}\n\n`));
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
    console.error("[DSAR] Error:", message);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: `Failed to generate DSAR response: ${message}` } },
      { status: 500 }
    );
  }
}
