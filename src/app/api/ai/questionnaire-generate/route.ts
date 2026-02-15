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
    const session = await auth();

    const identifier = session?.user?.email || req.headers.get("x-forwarded-for") || "anonymous";
    const rateLimit = await checkAIRateLimit(identifier, !!session?.user);
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
        } catch {
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
    console.error("Questionnaire generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to generate questionnaire",
        },
      },
      { status: 500 }
    );
  }
}
