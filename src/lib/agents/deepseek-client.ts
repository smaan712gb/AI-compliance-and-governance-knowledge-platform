import { deepseek } from "@/lib/deepseek";
import { estimateCost } from "./types";

interface DeepSeekCallOptions {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

interface DeepSeekCallResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * Call DeepSeek with retry logic and token tracking.
 */
export async function callDeepSeek(
  options: DeepSeekCallOptions,
): Promise<DeepSeekCallResult> {
  const {
    systemPrompt,
    userPrompt,
    model = "deepseek-chat",
    temperature = 0.3,
    maxTokens = 4000,
    jsonMode = false,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await deepseek.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      });

      const content = response.choices[0]?.message?.content || "";
      const usage = response.usage;
      const inputTokens = usage?.prompt_tokens || 0;
      const outputTokens = usage?.completion_tokens || 0;

      return {
        content,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        costUsd: estimateCost(inputTokens, outputTokens),
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on auth errors
      if (lastError.message.includes("401") || lastError.message.includes("403")) {
        throw lastError;
      }

      // Exponential backoff
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("DeepSeek call failed after retries");
}

/**
 * Parse JSON from DeepSeek response, handling markdown code blocks.
 */
export function parseJsonResponse<T>(content: string): T {
  // Strip markdown code blocks if present
  let cleaned = content.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  return JSON.parse(cleaned) as T;
}
