import { NextRequest, NextResponse } from "next/server";
import { questionnaireSchema } from "@/lib/validators/questionnaire";
import {
  buildQuestionnairePrompt,
  QUESTIONNAIRE_SYSTEM_PROMPT,
} from "@/lib/ai/questionnaire-engine";
import { deepseek } from "@/lib/deepseek";
import { auth } from "@/lib/auth";
import { checkAIRateLimit } from "@/lib/utils/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Auth is optional — used only for rate limit identification
    let userEmail: string | null = null;
    let isAuthenticated = false;
    try {
      const session = await auth();
      userEmail = session?.user?.email || null;
      isAuthenticated = !!session?.user;
    } catch {
      // Auth failure should not block the tool
    }

    const identifier = userEmail || req.headers.get("x-forwarded-for") || "anonymous";

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

    const body = await req.json();
    const parsed = questionnaireSchema.safeParse(body);

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

    const prompt = buildQuestionnairePrompt(parsed.data);

    const stream = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: QUESTIONNAIRE_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      stream: true,
      temperature: 0.3,
      max_tokens: 6000,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (streamError) {
          console.error("Questionnaire stream error:", streamError instanceof Error ? streamError.message : String(streamError));
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream error" })}\n\n`
            )
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
    console.error("Questionnaire generation error:", message, error instanceof Error ? error.stack : "");
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: `Failed to generate questionnaire: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
