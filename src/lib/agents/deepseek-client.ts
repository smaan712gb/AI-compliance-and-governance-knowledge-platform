import { deepseek } from "@/lib/deepseek";
import { estimateCost } from "./types";

interface DeepSeekCallOptions {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  enableFallback?: boolean;
}

export interface DeepSeekCallResult {
  content: string;
  reasoningContent?: string;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  costUsd: number;
  modelUsed: string;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * Call DeepSeek with retry logic, token tracking, and reasoner model support.
 *
 * When model is "deepseek-reasoner":
 * - temperature/top_p are NOT sent (unsupported by reasoner)
 * - reasoning_content is parsed from response
 * - Falls back to deepseek-chat if reasoner fails and enableFallback is true
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
    enableFallback = true,
  } = options;

  const isReasoner = model === "deepseek-reasoner";

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Build request — reasoner does NOT support temperature/top_p
      const messages = [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: userPrompt },
      ];

      const response = await deepseek.chat.completions.create({
        model,
        messages,
        max_tokens: isReasoner ? Math.min(maxTokens, 64000) : maxTokens,
        ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
        ...(!isReasoner ? { temperature } : {}),
      });

      const message = response.choices[0]?.message;
      const content = message?.content || "";

      // Extract reasoning_content for reasoner model
      // The OpenAI SDK types don't include this DeepSeek-specific field,
      // so we cast through unknown to access it
      const reasoningContent = isReasoner
        ? ((message as unknown as Record<string, unknown>)?.reasoning_content as string | undefined)
        : undefined;

      const usage = response.usage;
      const inputTokens = usage?.prompt_tokens || 0;
      const outputTokens = usage?.completion_tokens || 0;

      // DeepSeek reasoner reports reasoning tokens in completion_tokens_details
      const reasoningTokens = isReasoner
        ? ((usage as unknown as Record<string, unknown>)?.completion_tokens_details as Record<string, number>)?.reasoning_tokens || 0
        : 0;

      return {
        content,
        reasoningContent: reasoningContent || undefined,
        inputTokens,
        outputTokens,
        reasoningTokens,
        totalTokens: inputTokens + outputTokens,
        costUsd: estimateCost(inputTokens, outputTokens, model),
        modelUsed: model,
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

  // Fallback: if reasoner failed and fallback is enabled, try deepseek-chat
  if (isReasoner && enableFallback) {
    console.warn(
      `[DeepSeek] deepseek-reasoner failed after ${MAX_RETRIES} retries, falling back to deepseek-chat`,
    );
    return callDeepSeek({
      ...options,
      model: "deepseek-chat",
      enableFallback: false,
    });
  }

  throw lastError || new Error("DeepSeek call failed after retries");
}

/**
 * Parse JSON from DeepSeek response, handling markdown code blocks,
 * embedded prose, and truncated output.
 */
export function parseJsonResponse<T>(content: string): T {
  // Strategy 1: Strip markdown code blocks if present
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

  // Try direct parse first
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Continue to fallback strategies
  }

  // Strategy 2: Extract JSON object from surrounding prose
  // Find the first { and last } to extract the JSON object
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const extracted = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(extracted) as T;
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 3: Fix truncated JSON — if it ends abruptly, try to close it
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    let partial = cleaned.slice(firstBrace, lastBrace + 1);

    // Try to fix common truncation: unclosed strings and brackets
    // Count open/close braces and brackets
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escaped = false;

    for (const ch of partial) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (ch === "{") openBraces++;
        if (ch === "}") openBraces--;
        if (ch === "[") openBrackets++;
        if (ch === "]") openBrackets--;
      }
    }

    // Close any unclosed structures
    if (inString) partial += '"';
    while (openBrackets > 0) {
      partial += "]";
      openBrackets--;
    }
    while (openBraces > 0) {
      partial += "}";
      openBraces--;
    }

    try {
      return JSON.parse(partial) as T;
    } catch {
      // All strategies failed
    }
  }

  // All strategies exhausted
  throw new Error(
    `Failed to parse JSON from DeepSeek response (length: ${content.length}). First 200 chars: ${content.slice(0, 200)}`,
  );
}
