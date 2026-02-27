import { db } from "@/lib/db";
import { decryptField } from "@/lib/ccm/crypto";
import OpenAI from "openai";

// ============================================
// BYOK LLM ROUTER
// ============================================

export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: string;
}

/**
 * Gets the default LLM configuration for an organization.
 * Returns null if none configured.
 */
async function getDefaultLLMConfig(organizationId: string) {
  // Try default first, then any active config
  let config = await db.lLMConfiguration.findFirst({
    where: { organizationId, isDefault: true, isActive: true },
  });

  if (!config) {
    config = await db.lLMConfiguration.findFirst({
      where: { organizationId, isActive: true },
    });
  }

  return config;
}

/**
 * Creates an OpenAI-compatible client for the given provider.
 */
function createProviderClient(
  provider: string,
  apiKey: string,
  baseUrl?: string | null
): OpenAI {
  const providerBaseUrls: Record<string, string> = {
    OPENAI: "https://api.openai.com/v1",
    DEEPSEEK: "https://api.deepseek.com",
    AZURE_OPENAI: baseUrl || "https://api.openai.com/v1",
    // Gemini exposes an OpenAI-compatible endpoint — API key passed as Bearer token
    GOOGLE_GEMINI: "https://generativelanguage.googleapis.com/v1beta/openai",
  };

  // Supported providers use OpenAI-compatible REST APIs.
  // ANTHROPIC requires a native SDK — not yet supported.
  const resolvedBaseUrl = baseUrl || providerBaseUrls[provider] || "https://api.openai.com/v1";

  return new OpenAI({
    apiKey,
    baseURL: resolvedBaseUrl,
  });
}

/**
 * Routes an LLM request through the organization's configured provider.
 * Falls back to platform DeepSeek if no BYOK config exists.
 */
export async function routeLLMRequest(
  organizationId: string,
  request: LLMRequest
): Promise<LLMResponse> {
  const config = await getDefaultLLMConfig(organizationId);

  let client: OpenAI;
  let model: string;
  let provider: string;

  if (config) {
    const apiKey = decryptField(config.apiKeyEncrypted, organizationId);
    client = createProviderClient(config.provider, apiKey, config.baseUrl);
    model = config.modelId;
    provider = config.provider;
  } else {
    // Fallback to platform DeepSeek
    const { deepseek } = await import("@/lib/deepseek");
    client = deepseek as unknown as OpenAI;
    model = "deepseek-chat";
    provider = "DEEPSEEK";
  }

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: request.systemPrompt },
      { role: "user", content: request.userPrompt },
    ],
    temperature: request.temperature ?? 0.3,
    max_tokens: request.maxTokens ?? 4000,
  });

  return {
    content: response.choices[0]?.message?.content || "",
    inputTokens: response.usage?.prompt_tokens || 0,
    outputTokens: response.usage?.completion_tokens || 0,
    model,
    provider,
  };
}

/**
 * Routes an LLM request with streaming through the org's configured provider.
 * Returns a ReadableStream of SSE-formatted chunks.
 */
export async function routeLLMRequestStream(
  organizationId: string,
  request: LLMRequest
): Promise<{
  stream: ReadableStream<Uint8Array>;
  model: string;
  provider: string;
}> {
  const config = await getDefaultLLMConfig(organizationId);
  const encoder = new TextEncoder();

  let client: OpenAI;
  let model: string;
  let provider: string;

  if (config) {
    const apiKey = decryptField(config.apiKeyEncrypted, organizationId);
    client = createProviderClient(config.provider, apiKey, config.baseUrl);
    model = config.modelId;
    provider = config.provider;
  } else {
    const { deepseek } = await import("@/lib/deepseek");
    client = deepseek as unknown as OpenAI;
    model = "deepseek-chat";
    provider = "DEEPSEEK";
  }

  let inputTokens = 0;
  let outputTokens = 0;

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: request.systemPrompt },
            { role: "user", content: request.userPrompt },
          ],
          stream: true,
          // Request token usage in the final stream chunk (OpenAI-compatible providers)
          stream_options: { include_usage: true },
          temperature: request.temperature ?? 0.3,
          max_tokens: request.maxTokens ?? 4000,
        });

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
            );
          }
          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens || 0;
            outputTokens = chunk.usage.completion_tokens || 0;
          }
        }

        // Send token usage at the end
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ usage: { inputTokens, outputTokens } })}\n\n`
          )
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return { stream: readable, model, provider };
}

/**
 * Tests an LLM configuration by making a small request.
 */
export async function testLLMConfig(
  provider: string,
  apiKey: string,
  modelId: string,
  baseUrl?: string | null
): Promise<{ success: boolean; error?: string; latencyMs: number }> {
  const start = Date.now();
  try {
    const client = createProviderClient(provider, apiKey, baseUrl);
    const response = await client.chat.completions.create({
      model: modelId,
      messages: [{ role: "user", content: "Say OK" }],
      max_tokens: 5,
      temperature: 0,
    });

    const content = response.choices[0]?.message?.content || "";
    return {
      success: content.length > 0,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - start,
    };
  }
}
