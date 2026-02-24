import { NextRequest, NextResponse } from "next/server";
import { policyMapperSchema } from "@/lib/validators/policy-mapper";
import {
  buildPolicyMapperPrompt,
  POLICY_MAPPER_SYSTEM_PROMPT,
} from "@/lib/ai/policy-mapper-prompts";
import { deepseek } from "@/lib/deepseek";
import { auth } from "@/lib/auth";
import { checkAIRateLimit } from "@/lib/utils/rate-limit";
import { db } from "@/lib/db";
import { checkFeatureAccess, incrementUsage } from "@/lib/feature-gating";
import { estimateCost } from "@/lib/agents/types";

export async function POST(req: NextRequest) {
  try {
    // Auth is optional — used for rate limit and feature gating
    let userId: string | null = null;
    let userEmail: string | null = null;
    let isAuthenticated = false;
    try {
      const session = await auth();
      userId = session?.user?.id || null;
      userEmail = session?.user?.email || null;
      isAuthenticated = !!session?.user;
    } catch {
      // Auth failure should not block public tool
    }

    const identifier = userEmail || req.headers.get("x-forwarded-for") || "anonymous";

    // Rate limiting for all users
    try {
      const rateLimit = await checkAIRateLimit(identifier, isAuthenticated);
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
      console.warn("Rate limit check failed, allowing through:", rateLimitError instanceof Error ? rateLimitError.message : String(rateLimitError));
    }

    // Feature gating for authenticated users (free users get limited access)
    if (userId) {
      const access = await checkFeatureAccess(userId, "policy_mapping");
      if (!access.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FEATURE_LOCKED",
              message: access.upgradeRequired
                ? `You've reached your monthly policy mapping limit (${access.used}/${access.limit}). Upgrade for more.`
                : "Policy mapping is not available on your current plan.",
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
    const parsed = policyMapperSchema.safeParse(body);

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

    const prompt = buildPolicyMapperPrompt(parsed.data);

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
              { role: "system", content: POLICY_MAPPER_SYSTEM_PROMPT },
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
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
            if (chunk.usage) {
              inputTokens = chunk.usage.prompt_tokens || 0;
              outputTokens = chunk.usage.completion_tokens || 0;
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();

          // Post-stream: save to DB and increment usage
          try {
            const cost = estimateCost(inputTokens, outputTokens, "deepseek-chat");

            let companyId: string | null = null;
            if (userId) {
              const company = await db.companyProfile.findUnique({ where: { userId } });
              companyId = company?.id || null;

              if (company) {
                await incrementUsage(company.id, "policy_mapping");
              }
            }

            await db.policyMapping.create({
              data: {
                userId,
                companyId,
                frameworks: parsed.data.frameworks,
                policyDomain: parsed.data.policyDomain || null,
                policyText: parsed.data.policyText || null,
                industry: parsed.data.industry || null,
                companySize: parsed.data.companySize || null,
                aiResponse: fullContent,
                tokensUsed: inputTokens + outputTokens,
                costUsd: cost,
              },
            });
          } catch (dbError) {
            console.error("[Policy Mapper] Failed to save record:", dbError instanceof Error ? dbError.message : String(dbError));
          }
        } catch (streamError) {
          console.error("[Policy Mapper] Stream error:", streamError instanceof Error ? streamError.message : String(streamError));
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "An error occurred during analysis. Please try again." })}\n\n`)
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
    console.error("[Policy Mapper] Error:", message);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: `Failed to run policy mapping: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
