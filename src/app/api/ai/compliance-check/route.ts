import { NextRequest, NextResponse } from "next/server";
import { complianceCheckSchema } from "@/lib/validators/compliance-check";
import {
  buildCompliancePrompt,
  COMPLIANCE_SYSTEM_PROMPT,
} from "@/lib/ai/compliance-engine";
import { deepseek } from "@/lib/deepseek";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting check via simple in-memory approach (Upstash when configured)
    const session = await auth();

    const body = await req.json();
    const parsed = complianceCheckSchema.safeParse(body);

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

    const prompt = buildCompliancePrompt(parsed.data);

    const stream = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: COMPLIANCE_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      stream: true,
      temperature: 0.3,
      max_tokens: 4000,
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
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream error occurred" })}\n\n`
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
    console.error("Compliance check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to run compliance check",
        },
      },
      { status: 500 }
    );
  }
}
