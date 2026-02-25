import { NextRequest, NextResponse } from "next/server";
import { financialComplianceSchema } from "@/lib/validators/financial-compliance";
import {
  buildFinancialCompliancePrompt,
  FINANCIAL_COMPLIANCE_SYSTEM_PROMPT,
} from "@/lib/ai/financial-compliance-prompts";
import { deepseek } from "@/lib/deepseek";
import { auth } from "@/lib/auth";
import { checkAIRateLimit } from "@/lib/utils/rate-limit";
import { db } from "@/lib/db";
import { estimateCost } from "@/lib/agents/types";

export async function POST(req: NextRequest) {
  try {
    // Auth is optional — public tool with rate limiting
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

    // Rate limiting (admins bypass)
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
      console.warn("Rate limit check failed, allowing through:", rateLimitError instanceof Error ? rateLimitError.message : String(rateLimitError));
    }

    const body = await req.json();
    const parsed = financialComplianceSchema.safeParse(body);

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

    const prompt = buildFinancialCompliancePrompt(parsed.data);
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
              { role: "system", content: FINANCIAL_COMPLIANCE_SYSTEM_PROMPT },
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

          // Post-stream: save to DB
          try {
            const cost = estimateCost(inputTokens, outputTokens, "deepseek-chat");
            let companyId: string | null = null;
            if (userId) {
              const company = await db.companyProfile.findUnique({ where: { userId } });
              companyId = company?.id || null;
            }

            await db.financialComplianceCheck.create({
              data: {
                userId,
                companyId,
                domain: parsed.data.domain,
                jurisdictions: parsed.data.jurisdictions,
                entityType: parsed.data.entityType || null,
                transactionVolume: parsed.data.transactionVolume || null,
                financialSystemsUsed: parsed.data.financialSystemsUsed || [],
                concerns: parsed.data.concerns || [],
                aiResponse: fullContent,
                tokensUsed: inputTokens + outputTokens,
                costUsd: cost,
              },
            });
          } catch (dbError) {
            console.error("[Financial Compliance] Failed to save:", dbError instanceof Error ? dbError.message : String(dbError));
          }
        } catch (streamError) {
          const errMsg = streamError instanceof Error ? streamError.message : String(streamError);
          console.error("[Financial Compliance] Stream error:", errMsg);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `Financial compliance check failed: ${errMsg}` })}\n\n`));
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
    console.error("[Financial Compliance] Error:", message);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: `Failed to run financial compliance check: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
